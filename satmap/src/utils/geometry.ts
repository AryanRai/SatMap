import { CartesianVector } from '../types/orbit';

// --- Vector Math Utilities (SatCore module) ---
// Standard 3D vector operations used in geometric calculations.

/** Calculates the dot product of two Cartesian vectors. */
export const dotProduct = (v1: CartesianVector, v2: CartesianVector): number => {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

/** Calculates the magnitude (length) of a Cartesian vector. */
export const magnitude = (v: CartesianVector): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
};

/** Normalizes a Cartesian vector (scales it to unit length). */
export const normalize = (v: CartesianVector): CartesianVector => {
  const mag = magnitude(v);
  if (mag < 1e-9) { // Use a small epsilon for zero check
    console.warn('[SatCore/Geometry] Attempted to normalize a near-zero vector. Returning zero vector.');
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
};

/** Subtracts vector v2 from v1. */
export const subtract = (v1: CartesianVector, v2: CartesianVector): CartesianVector => {
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
};

/** Adds two Cartesian vectors. */
export const add = (v1: CartesianVector, v2: CartesianVector): CartesianVector => {
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
};

/** Scales a Cartesian vector by a scalar value. */
export const scale = (v: CartesianVector, scalar: number): CartesianVector => {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
};

/** Calculates the cross product of two Cartesian vectors. */
export const crossProduct = (v1: CartesianVector, v2: CartesianVector): CartesianVector => {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
};

// --- Constants for Communication Cones (SatCore module) ---

// Default Field of View for Iridium satellite antennas (downward-pointing).
// This value is also configurable via the UI (SimulationConfig).
export const IRIDIUM_DEFAULT_FOV_DEGREES = 62.0;

// Default Field of View for Beacon satellite antennas (horizon-aligned).
// This value is also configurable via the UI (SimulationConfig).
export const BEACON_DEFAULT_ANTENNA_FOV_DEGREES = 62.0;


// --- Communication Cone Logic (SatCore module) ---

/**
 * Defines the geometric properties of a communication cone.
 */
export interface GeometricCone {
  tip: CartesianVector;       // The ECI position of the satellite (antenna tip).
  axis: CartesianVector;      // Normalized ECI direction vector the cone is pointing.
  halfAngle: number;        // The half-angle of the cone in radians.
  satelliteId?: string;     // Optional: ID of the satellite this cone belongs to.
}

/**
 * Determines the nadir vector (points from satellite to Earth's center) in ECI frame.
 * Assumes Earth is centered at the ECI frame origin.
 * @param satelliteEciPos The ECI position of the satellite (km).
 * @returns A normalized CartesianVector pointing towards nadir.
 */
export const getNadirVector = (satelliteEciPos: CartesianVector): CartesianVector => {
  // Vector from satellite to origin (Earth's center) is -1 * satelliteEciPos.
  return normalize(scale(satelliteEciPos, -1));
};


/**
 * Checks if a target point is within a given communication cone.
 * Uses the dot product method to find the angle between the cone axis and the vector to the target.
 * 
 * @param targetPointEci The ECI position of the target (e.g., Beacon satellite) (km).
 * @param cone The communication cone (e.g., from an Iridium satellite).
 * @returns True if the target point is within the cone, false otherwise.
 */
export const isPointInCone = (targetPointEci: CartesianVector, cone: GeometricCone): boolean => {
  const vectorToTarget = subtract(targetPointEci, cone.tip);
  const normalizedVectorToTarget = normalize(vectorToTarget);

  // Cone axis and normalizedVectorToTarget should both be unit vectors.
  const cosAngle = dotProduct(cone.axis, normalizedVectorToTarget);
  
  // Clamp cosAngle to [-1, 1] to prevent Math.acos domain errors due to floating point inaccuracies.
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  const angleToTargetRadians = Math.acos(clampedCosAngle);

  // --- BEGIN DEBUG LOGGING for specific cones ---
  if (cone.satelliteId && (cone.satelliteId.startsWith('Beacon-Ant') || cone.satelliteId.includes('IRIDIUM') || cone.satelliteId.startsWith('Beacon-ZenithTestCone'))) {
    console.log(`    [isPointInCone Debug for ${cone.satelliteId} targeting point {x: ${targetPointEci.x.toFixed(0)}, y: ${targetPointEci.y.toFixed(0)}, z: ${targetPointEci.z.toFixed(0)}}]`);
    console.log(`      Is In Cone?: ${(angleToTargetRadians <= cone.halfAngle)}`);
  }
  // --- END DEBUG LOGGING for specific cones ---

  return angleToTargetRadians <= cone.halfAngle;
};

/**
 * Generates the communication cone for an Iridium satellite.
 * The cone points nadir (towards Earth's center) from the satellite's ECI position.
 * 
 * @param iridiumEciPos The ECI position of the Iridium satellite (km).
 * @param halfAngleRadians The half-angle of the Iridium satellite's communication cone in radians.
 * @param satelliteId Optional ID for the Iridium satellite.
 * @returns A GeometricCone object for the Iridium satellite.
 */
export const createIridiumCone = (
    iridiumEciPos: CartesianVector,
    halfAngleRadians: number,
    satelliteId?: string
): GeometricCone => {
    return {
        tip: iridiumEciPos,
        axis: getNadirVector(iridiumEciPos),
        halfAngle: halfAngleRadians,
        satelliteId: satelliteId,
    };
};

/**
 * Creates the two horizon-aligned communication cones for the Beacon satellite.
 * Antennas are assumed to point along the velocity and anti-velocity vectors
 * when projected onto the Beacon's local horizontal plane.
 * This function is currently NOT used by the main simulation handshake logic, as the hackathon
 * allows a simplification: "as long as the beacon is within the communication FOV of the iridium satellite, they can perform the handshake".
 * However, it's available if more detailed bi-directional cone checks are needed in the future.
 * 
 * @param beaconEciPos The ECI position of the Beacon satellite (km).
 * @param beaconEciVelocity The ECI velocity vector of the Beacon satellite (km/s).
 * @param beaconHalfAngleRadians The half-angle of the Beacon's antenna cone in radians.
 * @param beaconId Optional ID for the Beacon satellite.
 * @returns An array containing two GeometricCone objects, or an empty array if inputs are invalid.
 */
export const createBeaconAntennaCones = (
    beaconEciPos: CartesianVector,
    beaconEciVelocity: CartesianVector,
    beaconHalfAngleRadians: number,
    beaconId?: string
): GeometricCone[] => {
    // TODO: (Long Term) Bi-directional handshake logic is a future enhancement and might require more complex Beacon antenna modeling.
    // This implementation creates two horizon-aligned cones based on velocity.

    const zenithVector = normalize(beaconEciPos);
    if (magnitude(zenithVector) < 1e-9) { // Check if beaconEciPos itself was zero
        console.error("[SatCore/Geometry] Beacon ECI position is zero, cannot determine zenith for antenna cones.");
        return [];
    }

    // Project velocity onto the local horizontal plane: v_horiz = v - (v . zenith) * zenith
    const velocityComponentParallelToZenith = scale(
        zenithVector,
        dotProduct(beaconEciVelocity, zenithVector)
    );
    let horizontalVelocityComponent = subtract(beaconEciVelocity, velocityComponentParallelToZenith);
    
    const magHorizontalVelocity = magnitude(horizontalVelocityComponent);
    if (magHorizontalVelocity < 1e-9) {
        // console.warn(
        //     `[SatCore/Geometry] Beacon's horizontal velocity component is near zero (mag: ${magHorizontalVelocity}). ` +
        //     `Cannot define horizon-aligned antenna axes based on velocity. ` +
        //     `Falling back to an arbitrary horizontal direction.`
        // ); // Reduced console noise for this common case when velocity is purely radial initially
        // Fallback: If velocity projection is zero (e.g. satellite moving perfectly radially or is stationary relative to ECI origin for a moment),
        // pick an arbitrary horizontal direction.
        // Try crossing zenith with global X-axis. If zenith is parallel to X, try global Y-axis.
        let arbitraryHorizontalDir: CartesianVector;
        const globalX: CartesianVector = { x: 1, y: 0, z: 0 };
        const globalY: CartesianVector = { x: 0, y: 1, z: 0 };

        // Check if zenith is not largely aligned with X (dot product far from 1 or -1)
        if (Math.abs(dotProduct(zenithVector, globalX)) < 0.99) { 
            arbitraryHorizontalDir = normalize(crossProduct(zenithVector, globalX));
        } else { // Zenith is likely aligned with X (or -X), so cross with Y
            arbitraryHorizontalDir = normalize(crossProduct(zenithVector, globalY));
        }
        
        if (magnitude(arbitraryHorizontalDir) < 1e-9) {
             console.error("[SatCore/Geometry] Could not determine a fallback horizontal direction for Beacon antennas.");
             return [];
        }
        horizontalVelocityComponent = arbitraryHorizontalDir;
    }

    const antennaAxis1 = normalize(horizontalVelocityComponent);
    const antennaAxis2 = scale(antennaAxis1, -1); // Opposite direction

    const cone1: GeometricCone = {
        tip: beaconEciPos,
        axis: antennaAxis1,
        halfAngle: beaconHalfAngleRadians,
        satelliteId: beaconId ? `${beaconId}-Ant1` : 'Beacon-Ant1',
    };

    const cone2: GeometricCone = {
        tip: beaconEciPos,
        axis: antennaAxis2,
        halfAngle: beaconHalfAngleRadians,
        satelliteId: beaconId ? `${beaconId}-Ant2` : 'Beacon-Ant2',
    };

    return [cone1, cone2];
};