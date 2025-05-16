declare module 'satellite.js' {
  // Add type definitions for the parts of satellite.js you use
  // This is a basic starting point. You might need to expand this as you use more features.

  export interface Tle {
    name: string;
    line1: string;
    line2: string;
  }

  export interface SatRec {
    // This is an opaque type. The actual structure is complex.
    // You typically don't need to access its internals directly.
    [key: string]: any; // Allows access to properties like error, epochyr, etc. if needed
    error: number; // 0 if no error, >0 if error during twoline2satrec
  }

  export interface EciVec<T> {
    x: T;
    y: T;
    z: T;
  }
  
  export interface PositionAndVelocity {
    position: EciVec<number> | false;
    velocity: EciVec<number> | false;
  }

  export interface LookAngles {
    azimuth: number;   // Radians
    elevation: number; // Radians
    rangeSat: number;  // Kilometers
    latitude: number;  // Radians
    longitude: number; // Radians
    height: number;    // Kilometers (altitude)
  }

  export function twoline2satrec(line1: string, line2: string): SatRec;
  export function propagate(satrec: SatRec, date: Date): PositionAndVelocity | false;
  export function sgp4(satrec: SatRec, minutesAfterEpoch: number): PositionAndVelocity | false;
  
  export function gstime(date: Date): number;
  export function eciToGeodetic(eciCoords: EciVec<number>, gmst: number): LookAngles;
  export function geodeticToEci(geodeticCoords: LookAngles, gmst: number): EciVec<number>;
  
  export function degreesLat(radians: number): number;
  export function degreesLong(radians: number): number;
  export function radiansLat(degrees: number): number;
  export function radiansLong(degrees: number): number;

  // Constants (you might need to add more if you use them)
  export const constants: {
    GM: number;       // Earth gravitational constant km^3/s^2
    RADIUS_EARTH_KM: number; // Earth radius in km
    [key: string]: any;
  };

  // You might also need to declare other functions or types if you use them e.g.
  // dopplerFactor, eciToEcf, geodeticToEcf, etc.
} 