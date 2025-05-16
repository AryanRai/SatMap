import { TLE, SatellitePosition, CartesianVector, GeodeticPosition, NonPolarOrbitParams, SunSynchronousOrbitParams, BeaconOrbitParams } from '../types/orbit';
import { GM_EARTH, RADIUS_EARTH_KM, J2_EARTH, MINUTES_PER_DAY, SECONDS_PER_MINUTE, SECONDS_PER_DAY } from '../constants/physicalConstants';
// It is possible that satellite.js does not have official TypeScript types.
// If that's the case, we might need to use `any` or create custom declarations.
import * as satellite from 'satellite.js'; 

/**
 * Initializes a satellite record (SatRec) object from a TLE.
 * The SatRec is the primary object used by satellite.js for orbit propagation.
 * 
 * @param tle The TLE object containing name, line1, and line2.
 * @returns The SatRec object, or null if TLE parsing fails.
 */
export const initializeSatrecFromTLE = (tle: TLE): satellite.SatRec | null => {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    // Check for error code from twoline2satrec itself
    if (satrec && satrec.error && satrec.error !== 0) {
        console.error(`Error initializing satrec for ${tle.name} from TLE. Code: ${satrec.error} - ${getSatRecErrorMessage(satrec.error)}`);
        console.error(`TLE L1: ${tle.line1}`);
        console.error(`TLE L2: ${tle.line2}`);
        return null; 
    }
    return satrec;
  } catch (e) {
    console.error(`Exception initializing satrec for ${tle.name}:`, e);
    return null;
  }
};

/**
 * Propagates the satellite orbit to a specific point in time.
 * 
 * @param satrec The SatRec object for the satellite.
 * @param date The JavaScript Date object for the desired time.
 * @returns SatellitePosition (timestamp, ECI position, velocity, Geodetic position), or null if propagation fails.
 */
export const propagateSatellite = (satrec: satellite.SatRec, date: Date): (
    {
        positionEci: satellite.EciVec<number> | false, 
        velocityEci: satellite.EciVec<number> | false,
        positionGeodetic: satellite.LookAngles | false // LookAngles contains lat, long, height
    }
) | null => {
  if (!satrec) return null;

  try {
    // Propagate satellite to ECI coordinates
    // The result of propagate is either false or { position, velocity }
    const positionAndVelocity = satellite.propagate(satrec, date);

    // Check if propagation was successful and returned valid data
    if (positionAndVelocity === false || 
        typeof positionAndVelocity === 'boolean' || 
        !positionAndVelocity.position || 
        !positionAndVelocity.velocity || 
        positionAndVelocity.position.x == null || isNaN(positionAndVelocity.position.x) || 
        positionAndVelocity.position.y == null || isNaN(positionAndVelocity.position.y) || 
        positionAndVelocity.position.z == null || isNaN(positionAndVelocity.position.z) ) {
        console.warn(`Propagation failed or returned invalid/NaN ECI data for satrec ${satrec.satnum || '?'} at ${date.toISOString()}. Error code: ${satrec.error || 'N/A'}`);
        if (satrec.error && satrec.error !== 0) {
             console.warn(`SatRec error details: ${getSatRecErrorMessage(satrec.error)}`);
        }
        return null;
    }

    const positionEci = positionAndVelocity.position as satellite.EciVec<number>;
    const velocityEci = positionAndVelocity.velocity as satellite.EciVec<number>;

    // Convert ECI to Geodetic (latitude, longitude, altitude)
    // gstime function is needed for ECI to Geodetic conversion
    const gmst = satellite.gstime(date);
    const positionGeodetic = satellite.eciToGeodetic(positionEci, gmst);
    
    // satellite.js eciToGeodetic returns LookAngles type which has latitude, longitude, height (altitude)
    // It also returns range, azimuth, elevation if a ground station location is provided to eciToLookAngles
    // For direct eciToGeodetic, it's simpler.

    return {
        positionEci,
        velocityEci,
        positionGeodetic
    };

  } catch (e) {
    console.error(`Error during satellite propagation or coordinate conversion for satrec ${satrec.satnum || '?'}:`, e);
    return null;
  }
};

/**
 * Calculates satellite position over a period of time.
 *
 * @param satrec The SatRec object for the satellite.
 * @param startTime The start time as a JavaScript Date object.
 * @param durationHours The duration of the simulation in hours.
 * @param timeStepMinutes The time step for propagation in minutes.
 * @returns An array of SatellitePosition objects.
 */
export const getOrbitTrack = (
  satrec: satellite.SatRec,
  startTime: Date,
  durationHours: number,
  timeStepMinutes: number
): SatellitePosition[] => {
  const track: SatellitePosition[] = [];
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  let currentTime = new Date(startTime.getTime());

  while (currentTime <= endTime) {
    const propagationResult = propagateSatellite(satrec, currentTime);

    if (propagationResult && propagationResult.positionGeodetic && propagationResult.positionEci && propagationResult.velocityEci) {
        const geo = propagationResult.positionGeodetic as satellite.LookAngles;
        const eciPos = propagationResult.positionEci as satellite.EciVec<number>;
        const eciVel = propagationResult.velocityEci as satellite.EciVec<number>;

        track.push({
            timestamp: currentTime.getTime(),
            positionGeodetic: geodeticToPosition(geo),
            positionEci: eciToCartesian(eciPos),
            velocityEci: eciToCartesian(eciVel),
        });
    } else {
        // Log if propagation failed for a time step
        console.warn(`Propagation failed for satrec at time ${currentTime.toISOString()}`);
    }

    currentTime = new Date(currentTime.getTime() + timeStepMinutes * 60 * 1000);
  }
  return track;
};

// TODO: Implement functions to convert user-defined Beacon orbit parameters 
// (Sun-synchronous: Altitude + LST, Non-polar: Altitude + Inclination)
// into a TLE or directly into a satrec object. This is a complex part.
// For now, Beacon might have to be defined by a TLE.

/**
 * Helper function to get Julian Date from a JavaScript Date object.
 * satellite.js has jday, but it takes year, mon, day etc. separately.
 * This is a common requirement.
 */
const getJulianDate = (date: Date): number => {
  // Algorithm from Meeus, Astronomical Algorithms, 2nd Ed., Ch. 7
  let Y = date.getUTCFullYear();
  let M = date.getUTCMonth() + 1; // Month is 1-12
  const D = date.getUTCDate() + 
            (date.getUTCHours() / 24.0) + 
            (date.getUTCMinutes() / (24.0 * 60.0)) + 
            (date.getUTCSeconds() / (24.0 * 60.0 * 60.0)) + 
            (date.getUTCMilliseconds() / (24.0 * 60.0 * 60.0 * 1000.0));

  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100.0);
  const B = 2 - A + Math.floor(A / 4.0);
  const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
  return JD;
};

/**
 * Calculates the Sun's approximate Right Ascension (RA) and Declination (Dec).
 * @param date The date for which to calculate the Sun's position.
 * @returns { ra: number; dec: number } in radians.
 */
const getSunRaDec = (date: Date): { ra: number; dec: number } => {
  // Algorithm from Astronomical Almanac, simplified.
  // More accurate calculations would involve perturbations.
  const jd = getJulianDate(date);
  const n = jd - 2451545.0; // Days since J2000.0

  // Mean longitude of the Sun, corrected for aberration
  let L = (280.460 + 0.9856474 * n) % 360;
  if (L < 0) L += 360;
  L = satellite.radiansLong(L); // Convert to radians

  // Mean anomaly of the Sun
  let g = (357.528 + 0.9856003 * n) % 360;
  if (g < 0) g += 360;
  g = satellite.radiansLong(g);

  // Ecliptic longitude of the Sun
  const lambda = L + satellite.radiansLong(1.915) * Math.sin(g) + satellite.radiansLong(0.020) * Math.sin(2 * g);

  // Obliquity of the ecliptic (approximate)
  const epsilon = satellite.radiansLong(23.439 - 0.0000004 * n);

  // Right Ascension (RA)
  const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));

  // Declination (Dec)
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  return { ra: alpha, dec: delta }; // RA and Dec in radians
};

/**
 * Creates a SatRec object for a non-polar orbit Beacon satellite.
 * Assumes a circular orbit.
 * @param params Parameters for the non-polar orbit (altitude, inclination).
 * @param epoch The epoch for the orbital elements (typically simulation start time).
 * @returns A SatRec object or null if parameters are invalid.
 */
export const createSatrecForNonPolarBeacon = (
  params: NonPolarOrbitParams,
  epoch: Date
): satellite.SatRec | null => {
  if (params.altitude <= 0 || params.inclination < 0 || params.inclination > 180) {
    console.error('Invalid parameters for non-polar orbit beacon:', params);
    logBeaconParamsForDebugging(params, epoch, null, null, {error: "Invalid input parameters (alt/inc)"});
    return null;
  }
   if (params.raan !== undefined && (params.raan < 0 || params.raan >= 360)) {
    console.error('Invalid RAAN for non-polar orbit beacon. Must be [0, 360).', params);
    logBeaconParamsForDebugging(params, epoch, null, null, {error: "Invalid RAAN"});
    return null;
  }

  console.log(`Attempting to create Beacon (NonPolar) SatRec for alt: ${params.altitude}km, inc: ${params.inclination}deg, RAAN: ${params.raan !== undefined ? params.raan : 'default 0'}deg`);
  
  const tleDataResult = createTLEStringsFromBeaconParams(params, epoch);

  if (!tleDataResult) {
    console.error("Failed to generate TLE strings for NonPolar Beacon (tleDataResult is null).");
    // logBeaconParamsForDebugging is typically called inside createTLEStringsFromBeaconParams on its internal error
    return null;
  }

  const { tle1, tle2, paramsForDebug: calculatedParamsForDebug } = tleDataResult; 
  console.log("Generated TLE for NonPolar Beacon:");
  console.log(tle1);
  console.log(tle2);

  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    if (!satrec || (satrec.error && satrec.error !== 0)) {
      const errorMessage = satrec ? getSatRecErrorMessage(satrec.error) : "twoline2satrec returned invalid object";
      const errorCode = satrec ? satrec.error : "N/A";
      console.error(`Error initializing NonPolar Beacon SatRec from TLE. Code: ${errorCode} - ${errorMessage}`);
      logBeaconParamsForDebugging(params, epoch, tle1, tle2, calculatedParamsForDebug);
      return null;
    }
    console.log("NonPolar Beacon SatRec initialized successfully from TLE.");
    return satrec;
  } catch (e) {
    console.error("Exception during twoline2satrec for NonPolar Beacon:", e);
    logBeaconParamsForDebugging(params, epoch, tle1, tle2, calculatedParamsForDebug); 
    return null;
  }
};

/**
 * Creates a SatRec object for a Sun-Synchronous Orbit (SSO) Beacon satellite.
 * Assumes a circular orbit.
 * @param params Parameters for the SSO (altitude, LST at descending node).
 * @param epoch The epoch for the orbital elements.
 * @returns A SatRec object or null.
 */
export const createSatrecForSunSynchronousBeacon = (
  params: SunSynchronousOrbitParams,
  epoch: Date
): satellite.SatRec | null => {
  if (params.altitude <= 0 || params.localSolarTimeAtDescendingNode < 0 || params.localSolarTimeAtDescendingNode >= 24) {
    console.error('Invalid parameters for Sun-Synchronous orbit beacon:', params);
    logBeaconParamsForDebugging(params, epoch, null, null, {error: "Invalid input parameters (alt/LST)"});
    return null;
  }

  console.log(`Attempting to create Beacon (SSO) SatRec for alt: ${params.altitude}km, LST_DN: ${params.localSolarTimeAtDescendingNode}h`);

  const tleDataResult = createTLEStringsFromBeaconParams(params, epoch);

  if (!tleDataResult) {
    console.error("Failed to generate TLE strings for SSO Beacon (tleDataResult is null).");
    // logBeaconParamsForDebugging is typically called inside createTLEStringsFromBeaconParams on its internal error
    return null;
  }

  const { tle1, tle2, paramsForDebug: calculatedParamsForDebug } = tleDataResult; 
  console.log("Generated TLE for SSO Beacon:");
  console.log(tle1);
  console.log(tle2);

  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    if (!satrec || (satrec.error && satrec.error !== 0)) {
      const errorMessage = satrec ? getSatRecErrorMessage(satrec.error) : "twoline2satrec returned invalid object";
      const errorCode = satrec ? satrec.error : "N/A";
      console.error(`Error initializing SSO Beacon SatRec from TLE. Code: ${errorCode} - ${errorMessage}`);
      logBeaconParamsForDebugging(params, epoch, tle1, tle2, calculatedParamsForDebug);
      return null;
    }
    console.log("SSO Beacon SatRec initialized successfully from TLE.");
    return satrec;
  } catch (e) {
    console.error("Exception during twoline2satrec for SSO Beacon:", e);
    logBeaconParamsForDebugging(params, epoch, tle1, tle2, calculatedParamsForDebug); 
    return null;
  }
};

/**
 * Converts ECI coordinates (km) to CartesianVector (km).
 * This is mostly a type mapping if units are consistent.
 */
export const eciToCartesian = (eci: satellite.EciVec<number>): CartesianVector => {
    return { x: eci.x, y: eci.y, z: eci.z };
};

/**
 * Converts Geodetic coordinates (radians for lat/long, km for alt) to our GeodeticPosition type (degrees for lat/long).
 */
export const geodeticToPosition = (geo: satellite.LookAngles): GeodeticPosition => {
    return {
        latitude: satellite.degreesLat(geo.latitude),
        longitude: satellite.degreesLong(geo.longitude),
        altitude: geo.height
    };
};

// Helper to get error message string from satellite.js error code
const getSatRecErrorMessage = (errorCode: number): string => {
    // Error codes from satellite.js documentation or source (sgp4init part)
    const messages: { [key: number]: string } = {
        1: "Mean elements, ecc >= 1.0 or ecc < -0.001 or a < 0.95 er",
        2: "Mean motion less than 0.0",
        3: "Pert elements, ecc < 0.0 or ecc > 1.0", // Referring to perturbed eccentricity
        4: "Semi-latus rectum < 0.0",
        5: "Epoch elements are sub-orbital",
        6: "Satellite has decayed",
        // Add more as identified
    };
    return messages[errorCode] || "Unknown SGP4 error code from twoline2satrec.";
};

// Helper to log parameters when TLE generation/parsing fails
function logBeaconParamsForDebugging(
    beaconParams: BeaconOrbitParams,
    startTime: Date,
    tle1: string | null,
    tle2: string | null,
    calculatedParams?: any
) {
    console.log("--- Debug Info for Beacon TLE Processing ---");
    console.log("Input Beacon Params:", JSON.stringify(beaconParams));
    console.log("Input Start Time:", startTime.toISOString());
    if (calculatedParams) {
        console.log("Calculated Values for TLE:", JSON.stringify(calculatedParams, null, 2));
    }
    if (tle1) console.log("Generated TLE Line 1:", tle1);
    if (tle2) console.log("Generated TLE Line 2:", tle2);
    console.log("--------------------------------------------");
}

// TLE Generation Utilities
const calculateTLEChecksum = (line: string): number => {
    let sum = 0;
    for (let i = 0; i < line.length - 1; i++) { // Exclude the checksum digit itself
        const char = line[i];
        if (char >= '0' && char <= '9') {
            sum += parseInt(char, 10);
        } else if (char === '-') {
            sum += 1;
        }
    }
    return sum % 10;
};

const formatEpochDayForTLE = (epochDay: number): string => {
    // Format: DDD.DDDDDDDD (12 characters total)
    // Example: 201.12345678. If day < 100, needs leading space(s).
    const s = epochDay.toFixed(8);
    return s.padStart(12, ' ');
};

const formatAngleForTLE = (angleDeg: number): string => {
    // Format: DDD.DDDD (8 characters total, leading spaces)
    return angleDeg.toFixed(4).padStart(8, ' ');
};

const formatEccentricityForTLE = (ecc: number): string => {
    // Format: NNNNNNN (7 characters, leading decimal point assumed)
    // Example: 0.0012345 becomes "0012345"
    return (ecc * 1e7).toFixed(0).padStart(7, '0');
};

const formatMeanMotionForTLE = (mmRevPerDay: number): string => {
    // Format: NN.NNNNNNNN (11 characters total, leading spaces)
    return mmRevPerDay.toFixed(8).padStart(11, ' ');
};

// Standard string values for zeroed TLE fields
const TLE_ZERO_NDOT = " .00000000";    // 10 chars: First derivative of Mean Motion / 2
const TLE_ZERO_NDDOT = " 00000-0";   // 8 chars: Second derivative of Mean Motion / 6
const TLE_ZERO_BSTAR = " 00000-0";   // 8 chars: BSTAR drag term

const getTLEEpochDateTimeUTC = (date: Date): { epochyr: number, epochdays: number, yearForDesignator: number } => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-11
    const dayInMonth = date.getUTCDate();

    const yearForDesignator = year;
    const epochyr = year % 100;

    const startOfYear = Date.UTC(year, 0, 1, 0, 0, 0, 0); // Jan 1, 00:00:00 UTC
    const currentTime = Date.UTC(year, month, dayInMonth, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
    
    const diffMillis = currentTime - startOfYear;
    const oneDayMillis = 24 * 60 * 60 * 1000;
    const epochdays = (diffMillis / oneDayMillis) + 1.0; // Day of year (1-indexed) with fraction

    return { epochyr, epochdays, yearForDesignator };
};

const createTLEStringsFromBeaconParams = (
    beaconParams: BeaconOrbitParams,
    startTime: Date,
    satNumStr: string = "99999"
): { tle1: string, tle2: string, paramsForDebug: any } | null => {
    try {
        const { altitude, type } = beaconParams;
        const { epochyr, epochdays, yearForDesignator } = getTLEEpochDateTimeUTC(startTime);

        const mu = GM_EARTH;
        const earthRadiusKm = RADIUS_EARTH_KM;
        const semiMajorAxisKm = earthRadiusKm + altitude;
        const n_rad_per_sec = Math.sqrt(mu / Math.pow(semiMajorAxisKm, 3));
        const meanMotionRadPerMin = n_rad_per_sec * SECONDS_PER_MINUTE;
        const meanMotionRevPerDay = meanMotionRadPerMin * (MINUTES_PER_DAY / (2 * Math.PI));

        let inclinationDeg: number;
        let raanDeg: number;

        if (type === 'SunSynchronous') {
            const ssoParams = beaconParams as SunSynchronousOrbitParams;
            const a = semiMajorAxisKm;
            const e = 0.0001; // Near-circular assumption for SSO formulas
            const J2 = J2_EARTH;
            const R_eq = RADIUS_EARTH_KM;
            const Omega_dot_SSO = (2 * Math.PI) / (365.2422 * SECONDS_PER_DAY); // rad/s (sidereal year)
            
            let cos_i = -Omega_dot_SSO * (2 / 3) / (n_rad_per_sec * J2 * Math.pow(R_eq / a, 2) * Math.pow(1 / (1 - e * e), 2));
            cos_i = Math.max(-1, Math.min(1, cos_i));
            const inclinationRad = Math.acos(cos_i);
            inclinationDeg = inclinationRad * (180 / Math.PI);

            const sunRaDecRad = getSunRaDec(startTime);
            const lstRad = ssoParams.localSolarTimeAtDescendingNode * (Math.PI / 12);
            
            let raanRad = sunRaDecRad.ra - lstRad;
            raanRad = (raanRad % (2 * Math.PI));
            if (raanRad < 0) raanRad += (2 * Math.PI);
            raanDeg = raanRad * (180 / Math.PI);

        } else { // NonPolar
            const npParams = beaconParams as NonPolarOrbitParams;
            inclinationDeg = npParams.inclination;
            raanDeg = npParams.raan !== undefined ? npParams.raan : 0.0; // Default RAAN to 0 if not provided
        }

        const ecco = 0.0001; // Near-circular
        const argpoDeg = 0.0;
        const moDeg = 0.0;

        const satNumPadded = satNumStr.padEnd(5, ' ');
        const launchYearLastTwoDigits = yearForDesignator.toString().slice(-2).padStart(2, '0');
        const intlDesig = `${launchYearLastTwoDigits}001A`.padEnd(8, ' ');
        const epochYrStr = epochyr.toString().padStart(2, '0');
        const epochDayStr = formatEpochDayForTLE(epochdays);
        const elementSetNumPadded = "1".padStart(4, ' ');
        const revNumPadded = "1".padStart(5, ' ');

        const incStr = formatAngleForTLE(inclinationDeg);
        const raanStr = formatAngleForTLE(raanDeg);
        const eccStr = formatEccentricityForTLE(ecco);
        const argpoStr = formatAngleForTLE(argpoDeg);
        const moStr = formatAngleForTLE(moDeg);
        const meanMotionStr = formatMeanMotionForTLE(meanMotionRevPerDay);

        let line1 = `1 ${satNumPadded}U ${intlDesig} ${epochYrStr}${epochDayStr}${TLE_ZERO_NDOT} ${TLE_ZERO_NDDOT} ${TLE_ZERO_BSTAR} 0 ${elementSetNumPadded}`;
        line1 = `${line1.substring(0, 68)}${calculateTLEChecksum(line1)}`;

        let line2 = `2 ${satNumPadded} ${incStr} ${raanStr} ${eccStr} ${argpoStr} ${moStr} ${meanMotionStr}${revNumPadded}`;
        line2 = `${line2.substring(0, 68)}${calculateTLEChecksum(line2)}`;
        
        const paramsForDebug = {
            altitude, type, beaconParams, startTime: startTime.toISOString(), satNumStr,
            epochyr, epochdays, yearForDesignator,
            semiMajorAxisKm, meanMotionRadPerMin, meanMotionRevPerDay,
            inclinationDeg, raanDeg, ecco, argpoDeg, moDeg,
            _intlDesigUsed: intlDesig, _epochDayStrUsed: epochDayStr,
            _incStrUsed: incStr, _raanStrUsed: raanStr, _eccStrUsed: eccStr,
            _argpoStrUsed: argpoStr, _moStrUsed: moStr, _meanMotionStrUsed: meanMotionStr,
        };

        return { tle1: line1, tle2: line2, paramsForDebug: paramsForDebug };
    } catch (error) {
        console.error("Error during TLE string generation:", error);
        logBeaconParamsForDebugging(beaconParams, startTime, null, null, {error: (error as Error).message});
        return null;
    }
}; 