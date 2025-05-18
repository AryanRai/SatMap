import { TLE, BeaconOrbitParams, SimulationResults, SatellitePosition, Handshake, BlackoutPeriod, CartesianVector, SimulationConfig, OrbitType } from './types/orbit';
import {
    initializeSatrecFromTLE,
    createSatrecForNonPolarBeacon,
    createSatrecForSunSynchronousBeacon,
    propagateSatellite,
    eciToCartesian,
    geodeticToPosition // Added for explicit conversion if needed elsewhere, though propagateSatellite handles it
} from './utils/orbitCalculation';
import { fetchIridiumTLEs } from './services/tleService';
import { GeometricCone, createIridiumCone, isPointInCone, createHorizonAlignedAntennaCones, isLineOfSightClear, Point as GeometryPoint } from './utils/geometry';
import * as satellite from 'satellite.js'; // For SatRec type, and other satellite.js specific types/functions if needed

// Constants for FOV and simulation timing are now part of SimulationConfig
// const SIMULATION_DURATION_HOURS = 24; // Removed
// const TIME_STEP_MINUTES = 1; // Removed

interface ActiveLink {
    iridiumSatId: string;
    // Potentially more data about the link if needed
}

/**
 * Main simulation engine for SatMap (SatCore).
 * This function orchestrates the entire simulation process, including:
 * - Initializing satellite records (SatRecs) for the Beacon and Iridium constellation.
 * - Iterating through time steps for the specified simulation duration.
 * - Propagating satellite positions at each time step.
 * - Detecting communication handshakes between the Beacon and Iridium satellites.
 * - Identifying and logging communication blackout periods for the Beacon.
 * - Collecting data for visualization and final results.
 *
 * @param config The simulation configuration specifying Beacon parameters, FOVs, duration, etc.
 * @param startTime The start time of the simulation. Defaults to the current time if not provided.
 * @returns A Promise resolving to SimulationResults, containing all relevant data from the simulation.
 */
export const runSimulation = async (
    config: SimulationConfig,
    startTime: Date = new Date()
): Promise<SimulationResults> => {
    console.log("[SatCore] Simulation run requested with config:", config, "Start Time:", startTime.toISOString());

    // 1. Initialize Satellite Records (SatRecs)
    // ------------------------------------------
    console.log("[SatCore] Initializing Beacon satellite...");
    let beaconSatRec: satellite.SatRec | null;
    if (config.beaconParams.type === OrbitType.SunSynchronous) {
        beaconSatRec = createSatrecForSunSynchronousBeacon(config.beaconParams, startTime);
    } else {
        beaconSatRec = createSatrecForNonPolarBeacon(config.beaconParams, startTime);
    }

    if (!beaconSatRec) {
        // Detailed error logging is handled within createSatrecFor... and TLE generation.
        console.error("[SatCore] CRITICAL: Failed to initialize Beacon satellite record. Aborting simulation.");
        throw new Error('Failed to initialize Beacon satellite record. Check console for TLE generation or SatRec initialization errors.');
    }
    console.log("[SatCore] Beacon SatRec initialized successfully.");

    console.log("[SatCore] Fetching Iridium TLEs...");
    const iridiumTLEs: TLE[] = await fetchIridiumTLEs(config.iridiumDatasetSources);
    if (iridiumTLEs.length === 0) {
        console.error("[SatCore] CRITICAL: No Iridium TLEs fetched. Cannot run simulation.");
        throw new Error('No Iridium TLEs fetched. Ensure TLE service is working and datasets are selected.');
    }
    console.log(`[SatCore] Fetched ${iridiumTLEs.length} Iridium TLEs. Initializing SatRecs...`);

    const iridiumSatRecs: { id: string, rec: satellite.SatRec }[] = iridiumTLEs
        .map(tle => ({ id: tle.name, rec: initializeSatrecFromTLE(tle) }))
        .filter(item => item.rec !== null) as { id: string, rec: satellite.SatRec }[];

    if (iridiumSatRecs.length === 0) {
        console.error("[SatCore] CRITICAL: Failed to initialize any Iridium satellite records from TLEs.");
        throw new Error('Failed to initialize any Iridium SatRecs. Check TLE parsing and SatRec initialization logs.');
    }
    console.log(`[SatCore] Initialized ${iridiumSatRecs.length} Iridium SatRecs.`);

    // 2. Simulation Loop Setup & Variables
    // ------------------------------------
    const iridiumNadirFovRadians = config.iridiumFovDeg * (Math.PI / 180.0);      // FOV for Iridium's NADIR pointing cone
    const iridiumNadirHalfAngleRad = iridiumNadirFovRadians / 2.0;
    
    const beaconHorizonFovRadians = config.beaconFovDeg * (Math.PI / 180.0);    // FOV for Beacon's HORIZON pointing antennas
    const beaconHorizonHalfAngleRad = beaconHorizonFovRadians / 2.0;

    // For bi-directional mode, Iridium also uses its configured FOV for horizon scanning antennas
    const iridiumHorizonScanningFovRadians = config.iridiumFovDeg * (Math.PI / 180.0);
    const iridiumHorizonScanningHalfAngleRad = iridiumHorizonScanningFovRadians / 2.0;

    let totalHandshakes = 0;
    const handshakeLog: Handshake[] = [];
    const blackoutPeriods: BlackoutPeriod[] = [];
    const beaconTrack: SatellitePosition[] = [];
    const iridiumTracks: { [satelliteId: string]: SatellitePosition[] } = {};
    iridiumSatRecs.forEach(isat => iridiumTracks[isat.id] = []);
    const activeLinksLog: Array<Set<string>> = [];

    let currentTime = new Date(startTime.getTime());
    const simulationDurationMs = config.simulationDurationHours * 60 * 60 * 1000;
    const timeStepMs = config.simulationTimeStepSec * 1000;
    const endTime = new Date(startTime.getTime() + simulationDurationMs);

    let previousConnectedIridiumSatIds: Set<string> = new Set();
    let currentBlackout: { startTime: number } | null = null;

    let simulationStepCounter = 0;
    const logFrequencySteps = 60; // Log Beacon/Iridium ECI every N steps

    console.log(`[SatCore] Starting simulation loop from ${startTime.toISOString()} to ${endTime.toISOString()} with ${timeStepMs/1000}s steps.`);

    // 3. Main Simulation Loop
    while (currentTime <= endTime) {
        simulationStepCounter++;
        const isFirstStep = simulationStepCounter === 1;
        const shouldLogThisStep = isFirstStep || (simulationStepCounter > 0 && simulationStepCounter % logFrequencySteps === 0);

        const beaconPropagation = propagateSatellite(beaconSatRec, currentTime);
        if (!beaconPropagation || !beaconPropagation.positionEci || !beaconPropagation.velocityEci || !beaconPropagation.positionGeodetic) {
            console.warn(`[SatCore] Beacon propagation failed at ${currentTime.toISOString()}. Skipping this timestep for Beacon.`);
            // Decide if simulation should halt or just skip Beacon for this step
            // For now, we effectively skip this entire time step for calculations if beacon fails.
            currentTime = new Date(currentTime.getTime() + timeStepMs);
            continue;
        }
        
        const beaconCurrentPosEci = eciToCartesian(beaconPropagation.positionEci as satellite.EciVec<number>); 
        const beaconCurrentVelEci = eciToCartesian(beaconPropagation.velocityEci as satellite.EciVec<number>);
        const beaconCurrentPosGeoLookAngles = beaconPropagation.positionGeodetic as satellite.LookAngles;
        const beaconCurrentGeodetic = geodeticToPosition(beaconCurrentPosGeoLookAngles); // Store converted geodetic
        
        beaconTrack.push({
            timestamp: currentTime.getTime(),
            positionEci: beaconCurrentPosEci,
            velocityEci: beaconCurrentVelEci,
            positionGeodetic: beaconCurrentGeodetic 
        });

        if (shouldLogThisStep) {
            console.log(`[SatCore] Time: ${currentTime.toISOString()} (Step ${simulationStepCounter})`);
            console.log(`  Beacon ECI: x=${beaconCurrentPosEci.x.toFixed(0)}, y=${beaconCurrentPosEci.y.toFixed(0)}, z=${beaconCurrentPosEci.z.toFixed(0)} km`);
        }

        const currentConnectedIridiumSatIdsThisStep: Set<string> = new Set();
        let beaconIsInCommunicationThisStep = false;

        for (const iridiumSat of iridiumSatRecs) {
            let canCommunicate = false; // Initialize for each Iridium satellite check

            const iridiumPropagation = propagateSatellite(iridiumSat.rec, currentTime);
            if (!iridiumPropagation || !iridiumPropagation.positionEci || !iridiumPropagation.velocityEci || !iridiumPropagation.positionGeodetic) {
                console.warn(`Iridium ${iridiumSat.id} propagation failed at ${currentTime.toISOString()}`);
                continue; // Skip this Iridium sat for this timestep
            }
            const iridiumCurrentPosEci = eciToCartesian(iridiumPropagation.positionEci as satellite.EciVec<number>);
            const iridiumCurrentVelEci = eciToCartesian(iridiumPropagation.velocityEci as satellite.EciVec<number>);
            const iridiumCurrentPosGeoLookAngles = iridiumPropagation.positionGeodetic as satellite.LookAngles;
            const iridiumCurrentGeodetic = geodeticToPosition(iridiumCurrentPosGeoLookAngles); // Store converted

            iridiumTracks[iridiumSat.id].push({
                timestamp: currentTime.getTime(),
                positionEci: iridiumCurrentPosEci,
                velocityEci: iridiumCurrentVelEci,
                positionGeodetic: iridiumCurrentGeodetic
            });

            if (shouldLogThisStep && iridiumSatRecs.indexOf(iridiumSat) < 3) { // Log first 3 Iridium sats
                console.log(`  Iridium ${iridiumSat.id.substring(0,12)} ECI: x=${iridiumCurrentPosEci.x.toFixed(0)}, y=${iridiumCurrentPosEci.y.toFixed(0)}, z=${iridiumCurrentPosEci.z.toFixed(0)} (km)`);
            }

            // Revised Handshake Logic
            if (config.handshakeMode === 'one-way') {
                const iridiumNadirCone = createIridiumCone(iridiumCurrentPosEci, iridiumNadirHalfAngleRad, iridiumSat.id);
                canCommunicate = isPointInCone(beaconCurrentPosEci, iridiumNadirCone);
                // Debug log for one-way
                if (canCommunicate) {
                    console.log(`[SatCoreDebug] One-Way: Beacon IN Iridium ${iridiumSat.id} NADIR cone at ${currentTime.toISOString()}`);
                } else {
                    // console.log(`[SatCoreDebug] One-Way: Beacon NOT IN Iridium ${iridiumSat.id} NADIR cone at ${currentTime.toISOString()}`);
                }

            } else { // bi-directional
                const iridiumHorizonCones = createHorizonAlignedAntennaCones(iridiumCurrentPosEci, iridiumCurrentVelEci, iridiumHorizonScanningHalfAngleRad, `${iridiumSat.id}-HScan`);
                const beaconHorizonCones = createHorizonAlignedAntennaCones(beaconCurrentPosEci, beaconCurrentVelEci, beaconHorizonHalfAngleRad, "Beacon-HScan");

                let beaconInIridiumHorizonCone = false;
                for (const iCone of iridiumHorizonCones) {
                    if (isPointInCone(beaconCurrentPosEci, iCone)) {
                        beaconInIridiumHorizonCone = true;
                        break;
                    }
                }

                let iridiumInBeaconHorizonCone = false;
                if (beaconInIridiumHorizonCone) { // Only check this if the first condition is met (optimization)
                    for (const bCone of beaconHorizonCones) {
                        if (isPointInCone(iridiumCurrentPosEci, bCone)) {
                            iridiumInBeaconHorizonCone = true;
                            break;
                        }
                    }
                }
                canCommunicate = beaconInIridiumHorizonCone && iridiumInBeaconHorizonCone;
                // Debug log for bi-directional
                if (canCommunicate) {
                    console.log(`[SatCoreDebug] Bi-Directional: Mutual HORIZON cone intersection between Beacon and ${iridiumSat.id} at ${currentTime.toISOString()}`);
                } else {
                    // if (!beaconInIridiumHorizonCone) console.log(`[SatCoreDebug] Bi-Directional: Beacon NOT IN Iridium ${iridiumSat.id} HORIZON cone.`);
                    // if (beaconInIridiumHorizonCone && !iridiumInBeaconHorizonCone) console.log(`[SatCoreDebug] Bi-Directional: Iridium ${iridiumSat.id} NOT IN Beacon HORIZON cone.`);
                }
            }

            // Line of Sight Check (Earth Occultation) - Applied to both modes if canCommunicate is true so far
            if (canCommunicate) {
                const initialCanCommunicate = canCommunicate; // Store pre-LoS state for logging
                canCommunicate = isLineOfSightClear(beaconCurrentPosEci as GeometryPoint, iridiumCurrentPosEci as GeometryPoint);
                if (initialCanCommunicate && !canCommunicate) { 
                     console.log(`[SatCoreDebug] Link between Beacon and ${iridiumSat.id} blocked by Earth occultation at ${currentTime.toISOString()} (Mode: ${config.handshakeMode})`);
                }
            }
            
            if (canCommunicate) {
                beaconIsInCommunicationThisStep = true;
                currentConnectedIridiumSatIdsThisStep.add(iridiumSat.id);
                
                if (!previousConnectedIridiumSatIds.has(iridiumSat.id)) {
                    totalHandshakes++;
                    handshakeLog.push({ 
                        timestamp: currentTime.getTime(),
                        iridiumSatelliteId: iridiumSat.id,
                        beaconPosition: beaconCurrentGeodetic, // Use converted geodetic
                        iridiumPosition: iridiumCurrentGeodetic // Use converted geodetic
                    });
                }
            }
        }
        
        previousConnectedIridiumSatIds = new Set(currentConnectedIridiumSatIdsThisStep);
        activeLinksLog.push(new Set(currentConnectedIridiumSatIdsThisStep));

        if (!beaconIsInCommunicationThisStep) {
            if (!currentBlackout) {
                currentBlackout = { startTime: currentTime.getTime() };
            }
        } else {
            if (currentBlackout) {
                const blackoutEndTimeMs = currentTime.getTime(); 
                blackoutPeriods.push({
                    startTime: currentBlackout.startTime,
                    endTime: blackoutEndTimeMs,
                    duration: (blackoutEndTimeMs - currentBlackout.startTime) / 1000 
                });
                currentBlackout = null;
            }
        }

        currentTime = new Date(currentTime.getTime() + timeStepMs);
    }

    // Finalize last blackout period if simulation ends during one
    if (currentBlackout) {
        const endTimeMs = currentTime.getTime(); // Use the time *after* the loop ended
        blackoutPeriods.push({
            startTime: currentBlackout.startTime,
            endTime: endTimeMs,
            duration: (endTimeMs - currentBlackout.startTime) / 1000 // Duration in seconds
        });
    }

    // 4. Calculate Final Results
    // --------------------------
    let totalBlackoutDuration = 0;
    blackoutPeriods.forEach(p => totalBlackoutDuration += p.duration);
    const numberOfBlackouts = blackoutPeriods.length;
    const averageBlackoutDuration = numberOfBlackouts > 0 ? totalBlackoutDuration / numberOfBlackouts : 0;

    return {
        totalHandshakes,
        handshakeLog, // Add handshakeLog to results
        activeLinksLog, // Add activeLinksLog to results
        blackoutPeriods,
        totalBlackoutDuration,
        averageBlackoutDuration,
        numberOfBlackouts,
        beaconTrack, // Optional full track for visualization
        iridiumTracks // Optional full tracks for visualization
    };
}; 