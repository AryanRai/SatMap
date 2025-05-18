import { Constants } from "./constants";

export interface Point {
  x: number;
  y: number;
  z: number;
}

export const EARTH_RADIUS_KM = Constants.EARTH_RADIUS_KM; // Assuming you have this in constants

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
  earthRadius: number = EARTH_RADIUS_KM
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
      // Check if one point is inside the sphere and the other is outside
      // This can happen if the segment starts or ends inside the sphere
      const p1DistSq = f.x * f.x + f.y * f.y + f.z * f.z;
      const p2Vec = {x: point2.x - earthCenter.x, y: point2.y - earthCenter.y, z: point2.z - earthCenter.z};
      const p2DistSq = p2Vec.x * p2Vec.x + p2Vec.y * p2Vec.y + p2Vec.z * p2Vec.z;
      const rSq = earthRadius * earthRadius;

      if ((p1DistSq < rSq && p2DistSq > rSq) || (p1DistSq > rSq && p2DistSq < rSq)) {
        // One point is inside, one is outside, segment must pass through sphere boundary
         return false;
      }
      
      // If both points are outside the sphere, but the line segment intersects it, then it's blocked.
      if (p1DistSq > rSq && p2DistSq > rSq) {
        return false;
      }
      // If both points are inside the sphere, line of sight is considered "clear" (within Earth)
      // or if one point is on the surface and the other is outside, but the segment doesn't go "through" earth
      // this case implies the segment does not pass *through* the earth to connect.
      // However, the primary check for (t1/t2 between 0 and 1) should catch actual occultation.
      // If a point is inside and the other is also inside, no occultation.
      // If a segment grazes the earth or one point is on the surface,
      // this logic might need refinement depending on how "grazing" is treated.
      // For now, we assume if the segment itself has intersection points between P1 and P2, it's blocked.
      // The previous check for t1/t2 in [0,1] covers the main occultation cases.
      // This path (discriminant >= 0) means there *are* intersections with the infinite line.
      // We need to ensure those intersections are *between* the two points.
      // If t1 or t2 fall in [0,1], the segment intersects.
      // A special case: if the segment is entirely within the sphere, it's not "occulted" by the sphere surface itself.
      if (p1DistSq <= rSq && p2DistSq <= rSq) {
        return true; // Both points inside or on the surface, line of sight clear (not through earth mass)
      }

      return false; // Default to blocked if intersections are on the segment
    }
    // Intersection points are outside the segment [point1, point2].
    return true;
  }
} 