import { TLE, BeaconOrbitParams, SimulationResults, SatellitePosition, Handshake, BlackoutPeriod, CartesianVector } from './types/orbit';
import {
    initializeSatrecFromTLE,
    createSatrecForNonPolarBeacon,
    createSatrecForSunSynchronousBeacon,
    propagateSatellite,
    eciToCartesian // Ensure this is exported from orbitCalculation if used directly here, or rely on propagateSatellite output
} from './utils/orbitCalculation';
import { fetchIridiumTLEs } from './services/tleService';
import { GeometricCone, createIridiumCone, isPointInCone, createBeaconAntennaCones } from './utils/geometry';
import * as satellite from 'satellite.js'; // For SatRec type, and other satellite.js specific types/functions if needed

const SIMULATION_DURATION_HOURS = 24;
const TIME_STEP_MINUTES = 1;

interface ActiveLink {
    iridiumSatId: string;
    // Potentially more data about the link if needed
}

export const runSimulation = async (
    beaconParams: BeaconOrbitParams,
    startTime: Date = new Date() // Default to now if not provided
): Promise<SimulationResults> => {
    // 1. Initialize SatRecs
    // ----------------------
    let beaconSatRec: satellite.SatRec | null;
    if (beaconParams.type === 'SunSynchronous') {
        beaconSatRec = createSatrecForSunSynchronousBeacon(beaconParams, startTime);
    } else {
        beaconSatRec = createSatrecForNonPolarBeacon(beaconParams, startTime);
    }

    if (!beaconSatRec) {
        throw new Error('Failed to initialize Beacon satellite record.');
    }

    const iridiumTLEs: TLE[] = await fetchIridiumTLEs();
    if (iridiumTLEs.length === 0) {
        throw new Error('No Iridium TLEs fetched. Cannot run simulation.');
    }

    const iridiumSatRecs: { id: string, rec: satellite.SatRec }[] = iridiumTLEs
        .map(tle => ({ id: tle.name, rec: initializeSatrecFromTLE(tle) }))
        .filter(item => item.rec !== null) as { id: string, rec: satellite.SatRec }[];

    if (iridiumSatRecs.length === 0) {
        throw new Error('Failed to initialize any Iridium satellite records from TLEs.');
    }

    console.log(`Initialized Beacon. Initializing ${iridiumSatRecs.length} Iridium satellites.`);

    // 2. Simulation Loop Variables
    // ----------------------------
    let totalHandshakes = 0;
    const blackoutPeriods: BlackoutPeriod[] = [];
    const beaconTrack: SatellitePosition[] = [];
    const iridiumTracks: { [satelliteId: string]: SatellitePosition[] } = {};
    iridiumSatRecs.forEach(isat => iridiumTracks[isat.id] = []);

    let currentTime = new Date(startTime.getTime());
    const endTime = new Date(startTime.getTime() + SIMULATION_DURATION_HOURS * 60 * 60 * 1000);

    let previousConnectedIridiumSatIds: Set<string> = new Set();
    let currentBlackout: { startTime: number } | null = null;

    let logCounter = 0;

    // 3. Simulation Loop
    // ------------------
    while (currentTime <= endTime) {
        const isFirstStep = currentTime.getTime() === startTime.getTime();
        const shouldLogThisStep = isFirstStep || (logCounter > 0 && logCounter % 60 === 0); // Log every 60th step after first

        const beaconPropagation = propagateSatellite(beaconSatRec, currentTime);
        if (!beaconPropagation || !beaconPropagation.positionEci || !beaconPropagation.velocityEci || !beaconPropagation.positionGeodetic) {
            console.warn(`Beacon propagation failed at ${currentTime.toISOString()}`);
            currentTime = new Date(currentTime.getTime() + TIME_STEP_MINUTES * 60 * 1000);
            continue; // Skip this timestep if beacon fails
        }
        const beaconCurrentPosEci = eciToCartesian(beaconPropagation.positionEci as satellite.EciVec<number>); // Already Cartesian via propagate
        const beaconCurrentVelEci = eciToCartesian(beaconPropagation.velocityEci as satellite.EciVec<number>);
        const beaconCurrentPosGeo = beaconPropagation.positionGeodetic as satellite.LookAngles; // this is LookAngles, need conversion
        
        beaconTrack.push({
            timestamp: currentTime.getTime(),
            positionEci: beaconCurrentPosEci,
            velocityEci: beaconCurrentVelEci,
            positionGeodetic: {
                latitude: satellite.degreesLat(beaconCurrentPosGeo.latitude),
                longitude: satellite.degreesLong(beaconCurrentPosGeo.longitude),
                altitude: beaconCurrentPosGeo.height
            }
        });

        if (shouldLogThisStep) {
            console.log(`--- Time: ${currentTime.toISOString()} ---`);
            console.log(`Beacon ECI: x=${beaconCurrentPosEci.x.toFixed(0)}, y=${beaconCurrentPosEci.y.toFixed(0)}, z=${beaconCurrentPosEci.z.toFixed(0)} (km)`);
        }

        const currentConnectedIridiumSatIds: Set<string> = new Set();
        let beaconIsInCommunication = false;

        for (const iridiumSat of iridiumSatRecs) {
            const iridiumPropagation = propagateSatellite(iridiumSat.rec, currentTime);
            if (!iridiumPropagation || !iridiumPropagation.positionEci || !iridiumPropagation.velocityEci || !iridiumPropagation.positionGeodetic) {
                console.warn(`Iridium ${iridiumSat.id} propagation failed at ${currentTime.toISOString()}`);
                continue; // Skip this Iridium sat for this timestep
            }
            const iridiumCurrentPosEci = eciToCartesian(iridiumPropagation.positionEci as satellite.EciVec<number>);
            const iridiumCurrentVelEci = eciToCartesian(iridiumPropagation.velocityEci as satellite.EciVec<number>);
            const iridiumCurrentPosGeo = iridiumPropagation.positionGeodetic as satellite.LookAngles;

            iridiumTracks[iridiumSat.id].push({
                timestamp: currentTime.getTime(),
                positionEci: iridiumCurrentPosEci,
                velocityEci: iridiumCurrentVelEci,
                positionGeodetic: {
                    latitude: satellite.degreesLat(iridiumCurrentPosGeo.latitude),
                    longitude: satellite.degreesLong(iridiumCurrentPosGeo.longitude),
                    altitude: iridiumCurrentPosGeo.height
                }
            });

            if (shouldLogThisStep && iridiumSatRecs.indexOf(iridiumSat) < 3) { // Log first 3 Iridium sats
                console.log(`  Iridium ${iridiumSat.id.substring(0,12)} ECI: x=${iridiumCurrentPosEci.x.toFixed(0)}, y=${iridiumCurrentPosEci.y.toFixed(0)}, z=${iridiumCurrentPosEci.z.toFixed(0)} (km)`);
            }

            const iridiumCone = createIridiumCone(iridiumCurrentPosEci, iridiumSat.id);
            
            // Communication check: Beacon point within an Iridium cone
            if (isPointInCone(beaconCurrentPosEci, iridiumCone)) {
                beaconIsInCommunication = true;
                currentConnectedIridiumSatIds.add(iridiumSat.id);
                // Handshake: if not previously connected to THIS Iridium sat, it's a new handshake with it.
                if (!previousConnectedIridiumSatIds.has(iridiumSat.id)) {
                    totalHandshakes++;
                }
            }
        }
        previousConnectedIridiumSatIds = new Set(currentConnectedIridiumSatIds); // Update for next step

        // Blackout Logic
        if (!beaconIsInCommunication) {
            if (!currentBlackout) {
                currentBlackout = { startTime: currentTime.getTime() };
            }
        } else {
            if (currentBlackout) {
                const endTimeMs = currentTime.getTime();
                blackoutPeriods.push({
                    startTime: currentBlackout.startTime,
                    endTime: endTimeMs,
                    duration: (endTimeMs - currentBlackout.startTime) / 1000 // Duration in seconds
                });
                currentBlackout = null;
            }
        }

        currentTime = new Date(currentTime.getTime() + TIME_STEP_MINUTES * 60 * 1000);
        if (isFirstStep) logCounter = 1; // Start counter after first step
        else if (logCounter > 0) logCounter++;
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
        blackoutPeriods,
        totalBlackoutDuration,
        averageBlackoutDuration,
        numberOfBlackouts,
        beaconTrack, // Optional full track for visualization
        iridiumTracks // Optional full tracks for visualization
    };
}; 