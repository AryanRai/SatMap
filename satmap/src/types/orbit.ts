import { IridiumDatasetType } from '../services/tleService';
import { SatRec } from 'satellite.js';

/** Enum defining the types of orbits the Beacon satellite can have. */
export enum OrbitType {
  SunSynchronous = 'SunSynchronous',
  NonPolar = 'NonPolar',
}

/** Parameters for a Sun-Synchronous Orbit (SSO). */
export interface SunSynchronousOrbitParams {
  type: OrbitType.SunSynchronous;
  altitude: number; // Altitude above Earth's surface in km.
  localSolarTimeAtDescendingNode: number; // Local Solar Time (LST) at the descending node, in hours (e.g., 10.5 for 10:30 AM).
}

/** Parameters for a Non-Polar Orbit. */
export interface NonPolarOrbitParams {
  type: OrbitType.NonPolar;
  altitude: number; // Altitude above Earth's surface in km.
  inclination: number; // Orbital inclination in degrees (typically 30-98 for LEO).
  raan?: number; // Optional: Right Ascension of the Ascending Node in degrees (0-360). Defaults to 0 if not specified.
}

/** Union type for Beacon satellite's orbital parameters, accommodating different orbit types. */
export type BeaconOrbitParams = SunSynchronousOrbitParams | NonPolarOrbitParams;

/** Configuration settings for a single simulation run. */
export interface SimulationConfig {
  beaconParams: BeaconOrbitParams;
  iridiumFovDeg: number;              // Iridium satellite antenna Field of View in degrees.
  beaconFovDeg: number;               // Beacon satellite antenna Field of View in degrees.
  simulationDurationHours: number;    // Total duration of the simulation in hours.
  simulationTimeStepSec: number;      // Time step for simulation propagation in seconds.
  iridiumDatasetSources?: IridiumDatasetType[]; // Optional: Specifies which Iridium TLE sources to use (e.g., ["IRIDIUM", "IRIDIUM-NEXT"]).
  handshakeMode: 'one-way' | 'bi-directional'; // Added for handshake logic
  startTimeISO?: string; // Optional: User-specified start time in ISO format
}

/** Represents a 3D Cartesian vector, typically used for ECI (Earth-Centered Inertial) coordinates. */
export interface CartesianVector {
    x: number; // x-component in km.
    y: number; // y-component in km.
    z: number; // z-component in km.
}

/** Represents a geodetic position (latitude, longitude, altitude). */
export interface GeodeticPosition {
    latitude: number;  // Latitude in degrees (-90 to 90).
    longitude: number; // Longitude in degrees (-180 to 180).
    altitude: number;  // Altitude above Earth's surface in km.
}

/** Represents the state of a satellite at a specific point in time. */
export interface SatellitePosition {
  timestamp: number;                // Unix timestamp in milliseconds.
  positionGeodetic: GeodeticPosition; // Geodetic coordinates.
  positionEci: CartesianVector;       // Earth-Centered Inertial (ECI) position vector (km).
  velocityEci: CartesianVector;       // Earth-Centered Inertial (ECI) velocity vector (km/s).
}

/** Represents a Two-Line Element (TLE) set for defining an orbit. */
export interface TLE {
  name: string;   // Name of the satellite.
  line1: string;  // First line of the TLE.
  line2: string;  // Second line of the TLE.
}

/** Represents a communication handshake event between the Beacon and an Iridium satellite. */
export interface Handshake {
    timestamp: number;                // Unix timestamp of the handshake event in milliseconds.
    iridiumSatelliteId: string;       // ID of the Iridium satellite involved in the handshake.
    beaconPosition: GeodeticPosition;   // Geodetic position of the Beacon at the time of handshake.
    iridiumPosition: GeodeticPosition; // Geodetic position of the Iridium satellite at the time of handshake.
}

/** Represents a period during which the Beacon satellite has no communication link. */
export interface BlackoutPeriod {
    startTime: number;  // Unix timestamp of the blackout start in milliseconds.
    endTime: number;    // Unix timestamp of the blackout end in milliseconds.
    duration: number;   // Duration of the blackout in seconds.
}

/** Contains all results from a simulation run. */
export interface SimulationResults {
    totalHandshakes: number;          // Total number of unique handshakes during the simulation.
    handshakeLog: Handshake[];        // Chronological log of all handshake events.
    activeLinksLog: Array<Set<string>>; // For each simulation time step, a set of Iridium satellite IDs actively linked to the Beacon.
    blackoutPeriods: BlackoutPeriod[];// Array of all blackout periods encountered.
    totalBlackoutDuration: number;    // Total duration of all blackouts in seconds.
    averageBlackoutDuration: number;  // Average duration of a single blackout period in seconds.
    numberOfBlackouts: number;        // Total number of distinct blackout periods.
    beaconTrack?: SatellitePosition[]; // Optional: Full orbital track of the Beacon satellite for visualization.
    iridiumTracks?: { [satelliteId: string]: SatellitePosition[] }; // Optional: Full orbital tracks of Iridium satellites for visualization.
}

/** Represents a communication cone between the Beacon and an Iridium satellite. */
export interface CommunicationCone {
  satelliteId: string;
  timestamp: number;
  apex: CartesianVector;      // ECI position of the Iridium satellite
  axisVector: CartesianVector; // Direction of the cone (e.g., nadir pointing)
  halfAngleRad: number;       // Half angle of the cone in radians
}

// Adding SatRec type to global namespace for satellite.js if not already typed
// This was previously in a custom .d.ts file, including here for completeness
// if the satellite.d.ts is no longer used or managed.
// However, it's better practice if satellite.js has official or community types.
// For now, assuming SatRec is imported correctly if @types/satellite.js or similar is available.
// The import { SatRec } from 'satellite.js'; at the top handles this if types are present. 