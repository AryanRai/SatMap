// Earth gravitational constant (km^3/s^2)
// Standard value used by satellite.js (via WGS-72 model IIRC)
export const GM_EARTH = 398600.8; // km^3/s^2

// Earth radius (km)
// Average equatorial radius, commonly used. satellite.js might use a specific model value.
// For consistency, satellite.js uses a value for xe (earth radius km) typically 6378.135 km for WGS-72 and 6378.137 for WGS-84
// Let's use the one often seen with SGP4 based on WGS-72 era constants.
export const RADIUS_EARTH_KM = 6378.135; // km

export const MINUTES_PER_DAY = 1440.0;
export const SECONDS_PER_MINUTE = 60.0;
export const SECONDS_PER_DAY = MINUTES_PER_DAY * SECONDS_PER_MINUTE;

// J2 gravitational zonal harmonic for Earth (dimensionless)
// Used for calculating nodal precession for sun-synchronous orbits.
export const J2_EARTH = 0.00108263;

// Speed of light (km/s) - not directly needed for orbit generation but good for constants file
export const SPEED_OF_LIGHT_KM_S = 299792.458; 