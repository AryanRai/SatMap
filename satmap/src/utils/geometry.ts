import { CartesianVector } from '../types/orbit';
import { RADIUS_EARTH_KM } from '../constants/physicalConstants';

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
 * Creates two horizon-aligned communication/scanning cones for a satellite.
 * Antennas are assumed to point along the velocity and anti-velocity vectors
 * when projected onto the satellite's local horizontal plane.
 * 
 * @param satelliteEciPos The ECI position of the satellite (km).
 * @param satelliteEciVelocity The ECI velocity vector of the satellite (km/s).
 * @param halfAngleRadians The half-angle of the satellite's antenna cone in radians.
 * @param entityIdPrefix Optional ID prefix for the satellite/entity (e.g., "Beacon", "Iridium-Scan").
 * @returns An array containing two GeometricCone objects, or an empty array if inputs are invalid.
 */
export const createHorizonAlignedAntennaCones = (
    satelliteEciPos: CartesianVector,
    satelliteEciVelocity: CartesianVector,
    halfAngleRadians: number,
    entityIdPrefix?: string
): GeometricCone[] => {
    const zenithVector = normalize(satelliteEciPos);
    if (magnitude(zenithVector) < 1e-9) { 
        console.error(`[SatCore/Geometry] ECI position for ${entityIdPrefix || 'entity'} is zero, cannot determine zenith for horizon-aligned antenna cones.`);
        return [];
    }

    const velocityComponentParallelToZenith = scale(
        zenithVector,
        dotProduct(satelliteEciVelocity, zenithVector)
    );
    let horizontalVelocityComponent = subtract(satelliteEciVelocity, velocityComponentParallelToZenith);
    
    const magHorizontalVelocity = magnitude(horizontalVelocityComponent);
    if (magHorizontalVelocity < 1e-9) {
        let arbitraryHorizontalDir: CartesianVector;
        const globalX: CartesianVector = { x: 1, y: 0, z: 0 };
        const globalY: CartesianVector = { x: 0, y: 1, z: 0 };

        if (Math.abs(dotProduct(zenithVector, globalX)) < 0.99) { 
            arbitraryHorizontalDir = normalize(crossProduct(zenithVector, globalX));
        } else { 
            arbitraryHorizontalDir = normalize(crossProduct(zenithVector, globalY));
        }
        
        if (magnitude(arbitraryHorizontalDir) < 1e-9) {
             console.error(`[SatCore/Geometry] Could not determine a fallback horizontal direction for ${entityIdPrefix || 'entity'} antennas.`);
             return [];
        }
        horizontalVelocityComponent = arbitraryHorizontalDir;
    }

    const antennaAxis1 = normalize(horizontalVelocityComponent);
    const antennaAxis2 = scale(antennaAxis1, -1); 

    const cone1: GeometricCone = {
        tip: satelliteEciPos,
        axis: antennaAxis1,
        halfAngle: halfAngleRadians,
        satelliteId: entityIdPrefix ? `${entityIdPrefix}-Ant1` : 'UnknownEntity-Ant1',
    };

    const cone2: GeometricCone = {
        tip: satelliteEciPos,
        axis: antennaAxis2,
        halfAngle: halfAngleRadians,
        satelliteId: entityIdPrefix ? `${entityIdPrefix}-Ant2` : 'UnknownEntity-Ant2',
    };

    return [cone1, cone2];
};

export interface Point {
  x: number;
  y: number;
  z: number;
}

/**
 * Checks if the line of sight between two points is clear of Earth obstruction.
 * @param point1 Position of the first object (e.g., Beacon) in ECEF coordinates (km).
 * @param point2 Position of the second object (e.g., Iridium satellite) in ECEF coordinates (km).
 * @param earthCenter Position of Earth's center (typically [0, 0, 0]) in ECEF coordinates (km).
 * @param earthRadius Radius of the Earth (km).
 * @returns True if line of sight is clear, false otherwise.
 */
export function isLineOfSightClear(
  point1: Point,
  point2: Point,
  earthCenter: Point = { x: 0, y: 0, z: 0 },
  earthRadius: number = RADIUS_EARTH_KM
): boolean {
  const d = {
    x: point2.x - point1.x,
    y: point2.y - point1.y,
    z: point2.z - point1.z,
  };
  const f = {
    x: point1.x - earthCenter.x,
    y: point1.y - earthCenter.y,
    z: point1.z - earthCenter.z,
  };

  const a = d.x * d.x + d.y * d.y + d.z * d.z;
  const b = 2 * (f.x * d.x + f.y * d.y + f.z * d.z);
  const c = f.x * f.x + f.y * f.y + f.z * f.z - earthRadius * earthRadius;

  let discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    // No intersection or tangent, so line of sight is clear.
    return true;
  } else {
    // Line intersects sphere. Check if intersection points are between point1 and point2.
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    // If either t1 or t2 is between 0 and 1 (inclusive), an intersection point lies on the segment.
    // This means the line of sight is blocked.
    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
      const p1DistSq = f.x * f.x + f.y * f.y + f.z * f.z;
      const p2Vec = {x: point2.x - earthCenter.x, y: point2.y - earthCenter.y, z: point2.z - earthCenter.z};
      const p2DistSq = p2Vec.x * p2Vec.x + p2Vec.y * p2Vec.y + p2Vec.z * p2Vec.z;
      const rSq = earthRadius * earthRadius;

      // If one point is inside and the other is outside, the segment must pass through the sphere boundary.
      if ((p1DistSq < rSq && p2DistSq > rSq) || (p1DistSq > rSq && p2DistSq < rSq)) {
         return false;
      }
      
      // If both points are outside the sphere, but the line segment intersects it, then it's blocked.
      // This condition specifically targets occultation where the segment passes through the sphere.
      if (p1DistSq > rSq && p2DistSq > rSq) {
        return false;
      }

      // If both points are inside the sphere (or one/both on the surface), 
      // the line of sight is considered clear (not occulted by Earth's mass between them).
      if (p1DistSq <= rSq && p2DistSq <= rSq) {
        return true; 
      }

      // Fallback for any other intersecting cases not explicitly cleared above.
      // This ensures that if an intersection point (t1 or t2) is on the segment, 
      // and it's not cleared by the p1/p2 inside/outside checks, it's considered blocked.
      return false; 
    }
    // Intersection points are outside the segment [point1, point2].
    return true;
  }
}