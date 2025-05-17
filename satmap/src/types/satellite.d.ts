// Custom TypeScript Declaration File for 'satellite.js'. Provides basic typings used in SatMap.
declare module 'satellite.js' {
  // Note: A TLE interface is defined in types/orbit.ts for internal application use.

  /**
   * The Satellite Record (SatRec) is the core data structure in satellite.js.
   * It stores orbital elements from a TLE and the satellite state for propagation.
   * Initialized by `twoline2satrec`.
   */
  export interface SatRec {
    [key: string]: any; // Allows access to internal properties if needed for debugging.
    error: number;      // SGP4 error code. 0 indicates success.
                        // Non-zero codes indicate issues (e.g., decay, bad elements).
    // Common properties after initialization (not exhaustive):
    // satnum: string; no_kozai: number; ecco: number; inclo: number; nodeo: number; argpo: number; mo: number;
  }

  /** Represents an ECI (Earth-Centered Inertial) vector (position in km, velocity in km/s). */
  export interface EciVec<T> {
    x: T;
    y: T;
    z: T;
  }
  
  /** Output of `propagate` or `sgp4`, containing ECI position and velocity. */
  export interface PositionAndVelocity {
    position: EciVec<number> | false; // ECI position (km). False if propagation failed.
    velocity: EciVec<number> | false; // ECI velocity (km/s). False if propagation failed.
  }

  /** 
   * Represents geodetic coordinates (lat, lon, alt) and can include look angles.
   * Primarily used as the output of `eciToGeodetic` and `eciToLookAngles`.
   */
  export interface LookAngles {
    latitude: number;  // Geodetic Latitude [radians]
    longitude: number; // Geodetic Longitude [radians]
    height: number;    // Height above the ellipsoid [Kilometers]
    azimuth?: number;   // Azimuth [radians] (from observer) - present in `eciToLookAngles` output
    elevation?: number; // Elevation [radians] (from observer) - present in `eciToLookAngles` output
    rangeSat?: number;  // Range to satellite [Kilometers] - present in `eciToLookAngles` output
  }

  /** Parses a TLE string (two lines) and initializes a SatRec object. */
  export function twoline2satrec(line1: string, line2: string): SatRec;

  /** 
   * Propagates satellite orbit to a specific time using SGP4/SDP4 models.
   * @param satrec The SatRec object for the satellite.
   * @param date JavaScript Date object for the desired time.
   * @returns ECI position and velocity, or false if propagation fails.
   */
  export function propagate(satrec: SatRec, date: Date): PositionAndVelocity | false;

  /**
   * Legacy SGP4 propagation. `propagate` is generally preferred.
   * @param satrec The SatRec object.
   * @param minutesAfterEpoch Time in minutes since the TLE epoch.
   * @returns ECI position and velocity, or false on error.
   */
  export function sgp4(satrec: SatRec, minutesAfterEpoch: number): PositionAndVelocity | false;
  
  /** Calculates Greenwich Mean Sidereal Time (GMST) in radians for a given date. */
  export function gstime(date: Date): number;

  /** Converts ECI coordinates to geodetic (latitude, longitude, height). */
  export function eciToGeodetic(eciCoords: EciVec<number>, gmst: number): LookAngles;

  /** Converts geodetic coordinates to ECI. */
  export function geodeticToEci(geodeticCoords: LookAngles, gmst: number): EciVec<number>;
  
  // Degree/Radian conversion utilities
  export function degreesLat(radians: number): number;
  export function degreesLong(radians: number): number;
  export function radiansLat(degrees: number): number;
  export function radiansLong(degrees: number): number;

  /** Contains physical constants used by satellite.js. */
  export const constants: {
    GM: number;              // Earth gravitational constant (km^3/s^2)
    RADIUS_EARTH_KM: number; // Earth radius (km) - typically WGS84
    J2: number;              // J2 harmonic for Earth oblateness
    [key: string]: any;      // Allow other constants
  };
} 