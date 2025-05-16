export enum OrbitType {
  SunSynchronous = 'SunSynchronous',
  NonPolar = 'NonPolar',
}

export interface SunSynchronousOrbitParams {
  type: OrbitType.SunSynchronous;
  altitude: number; // in km
  localSolarTimeAtDescendingNode: number; // in hours (e.g., 10.5 for 10:30 AM)
}

export interface NonPolarOrbitParams {
  type: OrbitType.NonPolar;
  altitude: number; // in km
  inclination: number; // in degrees (30-98)
}

export type BeaconOrbitParams = SunSynchronousOrbitParams | NonPolarOrbitParams;

export interface CartesianVector { // ECI coordinates
    x: number; // km
    y: number; // km
    z: number; // km
}

export interface GeodeticPosition {
    latitude: number; // degrees
    longitude: number; // degrees
    altitude: number; // km
}


export interface SatellitePosition {
  timestamp: number; // Unix timestamp (ms) or other consistent time format
  position: GeodeticPosition; 
  velocity?: CartesianVector; // km/s, optional for now
}

export interface TLE {
  name: string;
  line1: string;
  line2: string;
}

export interface CommunicationCone {
    satelliteId: string;
    coneCenter: CartesianVector; // Position of the Iridium satellite
    axisVector: CartesianVector; // Direction the cone is pointing (e.g., towards nadir)
    halfAngle: number; // Half of the 62-degree FOV, in radians
}

export interface Handshake {
    timestamp: number;
    iridiumSatelliteId: string;
    beaconPosition: GeodeticPosition;
    iridiumPosition: GeodeticPosition;
}

export interface BlackoutPeriod {
    startTime: number;
    endTime: number;
    duration: number; // in seconds or minutes
}

export interface SimulationResults {
    totalHandshakes: number;
    blackoutPeriods: BlackoutPeriod[];
    totalBlackoutDuration: number; // in seconds or minutes
    averageBlackoutDuration: number; // in seconds or minutes
    numberOfBlackouts: number;
} 