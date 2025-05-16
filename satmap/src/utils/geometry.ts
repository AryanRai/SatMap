import { CartesianVector, GeodeticPosition } from '../types/orbit';
import { RADIUS_EARTH_KM } from '../constants/physicalConstants';

// --- Vector Math Utilities ---

export const dotProduct = (v1: CartesianVector, v2: CartesianVector): number => {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

export const magnitude = (v: CartesianVector): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
};

export const normalize = (v: CartesianVector): CartesianVector => {
  const mag = magnitude(v);
  if (mag === 0) {
    // Cannot normalize a zero vector, return as is or throw error
    // For now, return a zero vector to avoid division by zero errors silently.
    console.warn('Attempted to normalize a zero vector');
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
};

export const subtract = (v1: CartesianVector, v2: CartesianVector): CartesianVector => {
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
};

export const add = (v1: CartesianVector, v2: CartesianVector): CartesianVector => {
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
};

export const scale = (v: CartesianVector, scalar: number): CartesianVector => {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
};

export const crossProduct = (v1: CartesianVector, v2: CartesianVector): CartesianVector => {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
};

// --- Constants for Communication Cones ---

// Iridium satellites have downward-pointing antennas with a 62-degree FOV.
export const IRIDIUM_FOV_DEGREES = 62.0;
export const IRIDIUM_HALF_FOV_RADIANS = (IRIDIUM_FOV_DEGREES / 2.0) * (Math.PI / 180.0);

// Beacon satellite has two antennas aligned with the horizon.
// The FOV for these is not specified, assuming same as Iridium for now, can be changed.
export const BEACON_ANTENNA_FOV_DEGREES = 62.0; 
export const BEACON_ANTENNA_HALF_FOV_RADIANS = (BEACON_ANTENNA_FOV_DEGREES / 2.0) * (Math.PI / 180.0);


// --- Communication Cone Logic ---

/**
 * Defines a communication cone.
 * This might be similar to CommunicationCone in orbit.ts but focused on geometry aspects.
 */
export interface GeometricCone {
  tip: CartesianVector;       // The position of the satellite (antenna tip)
  axis: CartesianVector;      // Normalized direction vector the cone is pointing
  halfAngle: number;        // The half-angle of the cone in radians
  satelliteId?: string;     // Optional: ID of the satellite this cone belongs to
}

/**
 * Determines the nadir vector (points from satellite to Earth's center) in ECI frame.
 * Assumes Earth is a perfect sphere centered at origin for this calculation.
 * @param satelliteEciPos The ECI position of the satellite.
 * @returns A normalized CartesianVector pointing towards nadir.
 */
export const getNadirVector = (satelliteEciPos: CartesianVector): CartesianVector => {
  // Vector from satellite to origin (Earth's center) is -satelliteEciPos.
  return normalize(scale(satelliteEciPos, -1));
};


/**
 * Checks if a target point is within a given communication cone.
 * 
 * @param targetPoint The ECI position of the target (e.g., Beacon satellite).
 * @param cone The communication cone (e.g., from an Iridium satellite).
 * @returns True if the target point is within the cone, false otherwise.
 */
export const isPointInCone = (targetPoint: CartesianVector, cone: GeometricCone): boolean => {
  // Vector from the cone's tip (source satellite) to the target point
  const vectorToTarget = subtract(targetPoint, cone.tip);
  const normalizedVectorToTarget = normalize(vectorToTarget);

  // The cone's axis should already be normalized.
  // Calculate the angle between the cone's axis and the vector to the target.
  // cos(theta) = dot(A, B) / (mag(A) * mag(B))
  // Since cone.axis and normalizedVectorToTarget are normalized, mag(A)*mag(B) = 1.
  const cosAngle = dotProduct(cone.axis, normalizedVectorToTarget);
  
  // Clamp cosAngle to [-1, 1] to prevent Math.acos domain errors due to floating point inaccuracies
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  const angleToTarget = Math.acos(clampedCosAngle); // Angle in radians

  // If the angle to the target is less than or equal to the cone's half-angle,
  // the target is within the cone.
  return angleToTarget <= cone.halfAngle;
};

/**
 * Generates the communication cone for an Iridium satellite.
 * The cone points nadir (towards Earth's center) from the satellite's ECI position.
 * 
 * @param iridiumEciPos The ECI position of the Iridium satellite.
 * @param satelliteId Optional ID for the Iridium satellite.
 * @returns A GeometricCone object representing the Iridium satellite's communication cone.
 */
export const createIridiumCone = (
    iridiumEciPos: CartesianVector, 
    satelliteId?: string
): GeometricCone => {
    return {
        tip: iridiumEciPos,
        axis: getNadirVector(iridiumEciPos), // Axis points towards Earth's center
        halfAngle: IRIDIUM_HALF_FOV_RADIANS,
        satelliteId: satelliteId,
    };
};

/**
 * Creates the two horizon-aligned communication cones for the Beacon satellite.
 * Assumes antennas point along the velocity and anti-velocity vectors projected onto the local horizontal plane.
 * 
 * @param beaconEciPos The ECI position of the Beacon satellite.
 * @param beaconEciVelocity The ECI velocity vector of the Beacon satellite.
 * @param beaconId Optional ID for the Beacon satellite.
 * @returns An array containing two GeometricCone objects, or an empty array if inputs are invalid (e.g., zero velocity).
 */
export const createBeaconAntennaCones = (
    beaconEciPos: CartesianVector,
    beaconEciVelocity: CartesianVector,
    beaconId?: string
): GeometricCone[] => {
    // 1. Determine the local zenith vector (normal to the horizontal plane)
    const zenithVector = normalize(beaconEciPos);
    if (magnitude(zenithVector) === 0) {
        console.error("Beacon ECI position is zero, cannot determine zenith.");
        return [];
    }

    // 2. Project the velocity vector onto the local horizontal plane.
    // v_horizontal = v - (v . zenith) * zenith
    const velocityComponentParallelToZenith = scale(
        zenithVector,
        dotProduct(beaconEciVelocity, zenithVector)
    );
    let horizontalVelocityComponent = subtract(beaconEciVelocity, velocityComponentParallelToZenith);
    
    // Normalize the horizontal velocity component to get the direction for the first antenna.
    // If the horizontal velocity is zero (e.g., satellite is moving perfectly vertically, which is rare, or velocity is zero),
    // then the direction is undefined. We need a fallback or to handle this case.
    const magHorizontalVelocity = magnitude(horizontalVelocityComponent);
    if (magHorizontalVelocity < 1e-9) { // Check against a small epsilon for near-zero magnitude
        console.warn(
            `Beacon's horizontal velocity component is near zero (mag: ${magHorizontalVelocity}). ` +
            `Cannot reliably define horizon-aligned antenna axes based on velocity. ` +
            `Falling back to an arbitrary horizontal direction (e.g., X-axis of local frame if defined).`
        );
        // Fallback: If velocity projection is zero, we need an alternative way to pick horizontal directions.
        // One simple, though arbitrary, way is to find a vector perpendicular to zenith.
        // If zenith is aligned with global Z, pick global X. Otherwise, cross product with a non-parallel vector.
        let arbitraryHorizontalDir: CartesianVector;
        if (Math.abs(zenithVector.x) < 0.9 && Math.abs(zenithVector.y) < 0.9) { // If zenith is not mostly along Z
            arbitraryHorizontalDir = normalize(crossProduct(zenithVector, { x: 0, y: 0, z: 1 }));
        } else { // If zenith is mostly along Z, cross with X to get Y (or -Y)
            arbitraryHorizontalDir = normalize(crossProduct(zenithVector, { x: 1, y: 0, z: 0 }));
        }
        if (magnitude(arbitraryHorizontalDir) < 1e-9) { // Still zero? very unlikely if zenith was non-zero
             console.error("Could not determine a fallback horizontal direction for Beacon antennas.");
             return [];
        }
        horizontalVelocityComponent = arbitraryHorizontalDir;
    }

    const antennaAxis1 = normalize(horizontalVelocityComponent);
    const antennaAxis2 = scale(antennaAxis1, -1); // Opposite direction

    const cone1: GeometricCone = {
        tip: beaconEciPos,
        axis: antennaAxis1,
        halfAngle: BEACON_ANTENNA_HALF_FOV_RADIANS,
        satelliteId: beaconId ? `${beaconId}-Ant1` : 'Beacon-Ant1',
    };

    const cone2: GeometricCone = {
        tip: beaconEciPos,
        axis: antennaAxis2,
        halfAngle: BEACON_ANTENNA_HALF_FOV_RADIANS,
        satelliteId: beaconId ? `${beaconId}-Ant2` : 'Beacon-Ant2',
    };

    return [cone1, cone2];
};


// TODO:
// 1. Logic for handshake counting (when Beacon *enters* a cone).
// 2. Logic for blackout periods. 