import { TLE, SatellitePosition, CartesianVector, GeodeticPosition, NonPolarOrbitParams, SunSynchronousOrbitParams, BeaconOrbitParams, OrbitType } from '../types/orbit';
import { GM_EARTH, RADIUS_EARTH_KM, J2_EARTH, SECONDS_PER_MINUTE, SECONDS_PER_DAY } from '../constants/physicalConstants';
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
  const functionContext = "createSatrecForNonPolarBeacon";
  // Input validation (already in createTLEStringsFromBeaconParams, but good for early exit)
  if (params.altitude <= 0 || params.inclination < 0 || params.inclination > 180) {
    logBeaconParamsForDebugging(params, epoch, null, null, {error: "Invalid input parameters (alt/inc)"}, functionContext + " - Input Validation");
    return null;
  }
   if (params.raan !== undefined && (params.raan < 0 || params.raan >= 360)) {
    logBeaconParamsForDebugging(params, epoch, null, null, {error: "Invalid RAAN"}, functionContext + " - Input Validation");
    return null;
  }

  console.log(`Attempting to create Beacon (NonPolar) SatRec via TLE generation for alt: ${params.altitude}km, inc: ${params.inclination}deg, RAAN: ${params.raan !== undefined ? params.raan : 'default 0'}deg`);
  
  const tleDataResult = createTLEStringsFromBeaconParams(params, epoch);

  if (!tleDataResult) {
    // Error already logged by createTLEStringsFromBeaconParams
    console.error("Failed to generate TLE strings for NonPolar Beacon in " + functionContext);
    return null;
  }

  const { tle1, tle2, paramsForDebug } = tleDataResult; 

  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    if (!satrec || (satrec.error && satrec.error !== 0)) {
      const errorMessage = satrec ? getSatRecErrorMessage(satrec.error) : "twoline2satrec returned invalid object";
      const errorCode = satrec ? satrec.error : "N/A";
      logBeaconParamsForDebugging(params, epoch, tle1, tle2, {...paramsForDebug, error: `SatRec init failed: ${errorMessage} (Code: ${errorCode})`}, functionContext + " - SatRec Init Error");
      return null;
    }
    console.log("NonPolar Beacon SatRec initialized successfully from TLE.");
    return satrec;
  } catch (e: any) {
    logBeaconParamsForDebugging(params, epoch, tle1, tle2, {...paramsForDebug, error: `SatRec init exception: ${e.message}`}, functionContext + " - SatRec Init Exception");
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
  const functionContext = "createSatrecForSunSynchronousBeacon";
  // Input validation
  if (params.altitude <= 0 || params.localSolarTimeAtDescendingNode < 0 || params.localSolarTimeAtDescendingNode >= 24) {
    logBeaconParamsForDebugging(params, epoch, null, null, {error: "Invalid input parameters (alt/LST)"}, functionContext + " - Input Validation");
    return null;
  }
  console.log(`Attempting to create Beacon (SunSynch) SatRec via TLE generation for alt: ${params.altitude}km, LST_DN: ${params.localSolarTimeAtDescendingNode}h`);

  const tleDataResult = createTLEStringsFromBeaconParams(params, epoch);

  if (!tleDataResult) {
    console.error("Failed to generate TLE strings for SunSynchronous Beacon in " + functionContext);
    return null;
  }
  const { tle1, tle2, paramsForDebug } = tleDataResult;
  
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
     if (!satrec || (satrec.error && satrec.error !== 0)) {
      const errorMessage = satrec ? getSatRecErrorMessage(satrec.error) : "twoline2satrec returned invalid object";
      const errorCode = satrec ? satrec.error : "N/A";
      logBeaconParamsForDebugging(params, epoch, tle1, tle2, {...paramsForDebug, error: `SatRec init failed: ${errorMessage} (Code: ${errorCode})`}, functionContext + " - SatRec Init Error");
      return null;
    }
    console.log("SunSynchronous Beacon SatRec initialized successfully from TLE.");
    return satrec;
  } catch (e: any) {
    logBeaconParamsForDebugging(params, epoch, tle1, tle2, {...paramsForDebug, error: `SatRec init exception: ${e.message}`}, functionContext + " - SatRec Init Exception");
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
    const messages: { [key: number]: string } = {
        1: "Mean elements, epoch anomaly cannot be recovered (possible error in TLE epoch).",
        2: "Mean eccentricity is not between 0.0 and 1.0 (eccentricity out of bounds).", 
        3: "Perturbations: mean elements cannot be recovered (possible error in inclination or eccentricity).",
        4: "Semi-latus rectum is less than zero (implies non-elliptical, invalid orbit).", 
        5: "Epoch elements are indeterminate or inclination is out of bounds for SGP4.", 
        6: "Satellite has decayed (perigee less than Earth radius or period less than ~23 mins).",
    };
    return messages[errorCode] || `Unknown SGP4 error code ${errorCode}`;
};

// Helper function to log Beacon parameters for debugging, with context
function logBeaconParamsForDebugging(
    beaconParams: BeaconOrbitParams,
    startTime: Date,
    tle1: string | null,
    tle2: string | null,
    calculatedParams?: any,
    context?: string
) {
    console.warn(`--- Beacon Debugging Data (Context: ${context || 'General'}) ---`);
    console.warn("Input User Params:", JSON.stringify(beaconParams));
    console.warn("Epoch:", startTime.toISOString());
    if (calculatedParams && Object.keys(calculatedParams).length > 0) {
        const { error, ...paramsToLog } = calculatedParams; // Separate error for cleaner logging
        if (Object.keys(paramsToLog).length > 0) {
            console.warn("Calculated Orbital Elements/TLE Data:", JSON.stringify(paramsToLog));
        }
        if (error) {
            console.error("Error during Beacon TLE/SatRec gen:", error);
        }
    }
    if (tle1) console.warn("Generated TLE Line 1:", tle1);
    if (tle2) console.warn("Generated TLE Line 2:", tle2);
    console.warn("--- End Beacon Debugging Data ---");
}

// TLE String Formatting Utilities
const calculateTLEChecksum = (line: string): number => {
    let sum = 0;
    for (let i = 0; i < line.length; i++) { // Exclude checksum digit itself -> Corrected loop condition
        const char = line[i];
        if (char >= '0' && char <= '9') {
            sum += parseInt(char, 10);
        } else if (char === '-') {
            sum += 1;
        }
    }
    return sum % 10;
};

// General string padding helper
const formatStringPadded = (str: string, length: number, padChar: string = ' ', padStart: boolean = true): string => {
    if (str.length > length) return str.substring(0, length); // Truncate if too long
    if (padStart) {
        return str.padStart(length, padChar);
    }
    return str.padEnd(length, padChar);
};

const formatAngleForTLE = (angleDeg: number): string => {
    let s = angleDeg.toFixed(4);
    if (s.length > 8) { // e.g. -123.4567
        s = angleDeg.toFixed(3); // reduce precision to fit
        if (s.length > 8) s = angleDeg.toFixed(2);
    }
    return formatStringPadded(s, 8);
};

const formatEccentricityForTLE = (ecc: number): string => {
    // Format: NNNNNNN (7 characters, leading decimal point assumed in TLE definition)
    return Math.round(ecc * 1e7).toString().padStart(7, '0');
};

const formatMeanMotionForTLE = (mmRevPerDay: number): string => {
    // Format: NN.NNNNNNNN (11 characters total)
    let s = mmRevPerDay.toFixed(8);
    // Ensure it fits, e.g. if it was 100.12345678, it's too long
    if (s.split('.')[0].length > 2) { 
      s = mmRevPerDay.toFixed(7); // Adjust precision
      if (s.split('.')[0].length > 2) s = mmRevPerDay.toFixed(6);
    }
    return formatStringPadded(s, 11);
};

// Specific for epoch day: DDD.DDDDDDDD (12 characters total)
const formatEpochDayForTLE = (epochDay: number): string => {
    let s = epochDay.toFixed(8);
    return formatStringPadded(s, 12);
};

// Formatter for mean motion derivatives (ndot/2, nddot/6) and BSTAR drag term.
// TLE format: " sNNNNN+E" or " .NNNNN+E" (s is sign of mantissa, . is for <1)
// Example: val=0 -> " 00000-0"
// This is a simplified version for zero or very small values.
const formatScientificTLE = (value: number, isNdotOrNddot: boolean): string => {
    if (value === 0.0) {
        return isNdotOrNddot ? " .00000000" : " 00000-0"; // ndot uses different spacing
    }
    // Simplified: for non-zero, this would be complex. Assuming we only generate TLEs with these zeroed out.
    // If we need to generate non-zero, we'd need a proper scientific notation formatter for TLE.
    // For Ndot / Nddot: " s.XXXXX +/-E" -> e.g. " +.12345 +0"
    // For BSTAR:      " SXXXXX +/-E" -> e.g. " +12345 -4"
    // The satellite.js library expects specific formats that are hard to replicate generally
    // without knowing the exact field. For now, we use fixed zero strings for these.
    return isNdotOrNddot ? " .00000000" : " 00000-0"; 
};

const getTLEEpochDateTimeUTC = (date: Date): { epochyr: number, epochdays: number, yearForDesignator: number } => {
    const year = date.getUTCFullYear();
    const epochyr = year % 100; // Last two digits of year

    // Calculate day of year (1.0 for Jan 1st 00:00:00 UTC)
    const startOfYear = Date.UTC(year, 0, 1, 0, 0, 0, 0); // Jan 1st, 00:00:00 UTC
    const currentTime = date.getTime();
    const msInDay = 24 * 60 * 60 * 1000;
    const epochdays = (currentTime - startOfYear) / msInDay + 1.0;

    return { epochyr, epochdays, yearForDesignator: year };
};

// Constants for TLE generation (to be used by createTLEStringsFromBeaconParams)
const TLE_LINE_LENGTH = 69;
const DEFAULT_ECCENTRICITY = 0.0000001; 
const DEFAULT_ARG_PERIGEE = 0.0;
const DEFAULT_MEAN_ANOMALY = 0.0;
const DEFAULT_EPHEMERIS_TYPE = 0;
const DEFAULT_CLASSIFICATION = 'U'; 
const DEFAULT_ELEMENT_SET_NO = 999; // Placeholder
const SAT_NUM_BEACON = "99990"; // Specific satnum for our beacon
const TLE_ZERO_NDOT_STRING = " .00000000"; // 10 chars for ndot/2
const TLE_ZERO_NDDOT_BSTAR_STRING = " 00000-0"; // 8 chars, for nddot/6 and BSTAR

/**
 * Generates TLE (Two-Line Element) strings from Beacon orbital parameters.
 * @param beaconParams Parameters for the Beacon's orbit.
 * @param epochDate The epoch for which the TLE is generated (simulation start time).
 * @returns An object containing TLE line1, line2, and debug params, or null on failure.
 */
const createTLEStringsFromBeaconParams = (
    beaconParams: BeaconOrbitParams,
    epochDate: Date
): { tle1: string, tle2: string, paramsForDebug: any } | null => {
    const functionContext = "createTLEStringsFromBeaconParams";
    try {
        const { epochyr, epochdays, yearForDesignator } = getTLEEpochDateTimeUTC(epochDate);

        const intlDesigYear = yearForDesignator.toString().slice(-2);
        const intlDesigLaunchNum = "999"; 
        const intlDesigPiece = "A";    
        const intlDesig = `${formatStringPadded(intlDesigYear, 2, '0')}${formatStringPadded(intlDesigLaunchNum, 3, '0')}${formatStringPadded(intlDesigPiece, 3, ' ', false)}`;

        const altitudeKm = beaconParams.altitude;
        if (altitudeKm <= 0) {
            logBeaconParamsForDebugging(beaconParams, epochDate, null, null, {error: "Altitude must be positive"}, functionContext);
            return null;
        }
        const semiMajorAxisKm = RADIUS_EARTH_KM + altitudeKm;
        const meanMotionRadPerSec = Math.sqrt(GM_EARTH / Math.pow(semiMajorAxisKm, 3));
        const meanMotionRevPerDay = meanMotionRadPerSec * (SECONDS_PER_DAY / (2 * Math.PI));

        let inclinationDeg: number;
        let raanDeg: number; 

        const sunRaDecEpoch = getSunRaDec(epochDate); 
        const sunRaEpochDeg = satellite.degreesLong(sunRaDecEpoch.ra); 

        if (beaconParams.type === OrbitType.SunSynchronous) {
            const ssoParams = beaconParams as SunSynchronousOrbitParams; // Explicit cast after check
            const lstDNAboveEquatorHours = ssoParams.localSolarTimeAtDescendingNode;
            if (lstDNAboveEquatorHours < 0 || lstDNAboveEquatorHours >= 24) {
                 logBeaconParamsForDebugging(beaconParams, epochDate, null, null, {error: "Invalid LST_DN (0-23.99)"}, functionContext);
                return null;
            }
            const lstANHours = (lstDNAboveEquatorHours + 12) % 24;
            raanDeg = (lstANHours * 15.0 + sunRaEpochDeg) % 360;
            if (raanDeg < 0) raanDeg += 360;
            
            inclinationDeg = 98.6; 
            if (ssoParams.altitude < 500) inclinationDeg = 97.4; 
            else if (ssoParams.altitude > 1000) inclinationDeg = 99.5;

        } else if (beaconParams.type === OrbitType.NonPolar) { // Added explicit else if for NonPolar
            const npParams = beaconParams as NonPolarOrbitParams; // Explicit cast
            inclinationDeg = npParams.inclination;
            if (inclinationDeg < 0 || inclinationDeg > 180) {
                logBeaconParamsForDebugging(beaconParams, epochDate, null, null, {error: "Invalid Inclination (0-180)"}, functionContext);
                return null;
            }
            raanDeg = npParams.raan !== undefined ? npParams.raan : 0.0;
            if (raanDeg < 0 || raanDeg >= 360) {
                logBeaconParamsForDebugging(beaconParams, epochDate, null, null, {error: "Invalid RAAN (0-359.99)"}, functionContext);
                return null;
            }
        } else {
            // Should not happen if beaconParams.type is always one of the OrbitType enum values
            logBeaconParamsForDebugging(beaconParams, epochDate, null, null, {error: "Unknown beacon orbit type"}, functionContext);
            return null;
        }

        const satNumPadded = formatStringPadded(SAT_NUM_BEACON, 5);
        const epochYrStr = formatStringPadded(epochyr.toString(), 2, '0');
        const epochDayStr = formatEpochDayForTLE(epochdays);
        const elementSetNumPadded = formatStringPadded(DEFAULT_ELEMENT_SET_NO.toString(), 4);
        
        let line1 = "1 "; 
        line1 += satNumPadded;                     
        line1 += DEFAULT_CLASSIFICATION;           
        line1 += " ";                              
        line1 += formatStringPadded(intlDesigYear, 2, '0'); 
        line1 += formatStringPadded(intlDesigLaunchNum, 3, '0'); 
        line1 += formatStringPadded(intlDesigPiece, 3, ' ', false); 
        line1 += " "; 
        line1 += epochYrStr;                     
        line1 += epochDayStr;                    
        line1 += " ";                              
        line1 += TLE_ZERO_NDOT_STRING;           
        line1 += " ";                              
        line1 += TLE_ZERO_NDDOT_BSTAR_STRING;    
        line1 += " ";                              
        line1 += TLE_ZERO_NDDOT_BSTAR_STRING;    
        line1 += " ";                              
        line1 += DEFAULT_EPHEMERIS_TYPE.toString(); 
        line1 += " "; // <--- INSERTED SPACE for column 64
        line1 += elementSetNumPadded; // elementSetNumPadded is already 4 chars like " 999"
        line1 += calculateTLEChecksum(line1).toString(); 

        if (line1.length !== TLE_LINE_LENGTH) {
            logBeaconParamsForDebugging(beaconParams, epochDate, line1, null, {error: `TLE Line 1 generated with incorrect length: ${line1.length}`}, functionContext);
            return null;
        }

        let line2 = "2 ";
        line2 += satNumPadded;                     
        line2 += " ";                              
        line2 += formatAngleForTLE(inclinationDeg); 
        line2 += " ";                              
        line2 += formatAngleForTLE(raanDeg);        
        line2 += " ";                              
        line2 += formatEccentricityForTLE(DEFAULT_ECCENTRICITY); 
        line2 += " ";                              
        line2 += formatAngleForTLE(DEFAULT_ARG_PERIGEE); 
        line2 += " ";                              
        line2 += formatAngleForTLE(DEFAULT_MEAN_ANOMALY);  
        line2 += " ";                              
        line2 += formatMeanMotionForTLE(meanMotionRevPerDay); 
        // Revolution number at epoch field (cols 64-68 in line 2)
        // This should be right-justified, 5 digits. Let's use 0 for now.
        line2 += formatStringPadded("0", 5, ' '); // Changed from formatStringPadded("0", 5) to ensure space padding from left.
        line2 += calculateTLEChecksum(line2).toString(); 

        if (line2.length !== TLE_LINE_LENGTH) {
            logBeaconParamsForDebugging(beaconParams, epochDate, line1, line2, {error: `TLE Line 2 generated with incorrect length: ${line2.length}`}, functionContext);
            return null;
        }
        
        const paramsForDebug = {
            altitudeKm,
            semiMajorAxisKm,
            inputInclination: beaconParams.type === OrbitType.NonPolar ? (beaconParams as NonPolarOrbitParams).inclination : undefined,
            inputLST_DN: beaconParams.type === OrbitType.SunSynchronous ? (beaconParams as SunSynchronousOrbitParams).localSolarTimeAtDescendingNode : undefined,
            inputRAAN_NonPolar: beaconParams.type === OrbitType.NonPolar ? (beaconParams as NonPolarOrbitParams).raan : undefined,
            calculatedInclinationDeg: inclinationDeg,
            calculatedRaanDeg: raanDeg,
            meanMotionRevPerDay,
            epochJulianDate: getJulianDate(epochDate), 
            sunRaEpochDeg,
            epochYearForTLE: epochyr,
            epochDayForTLE: epochdays,
            eccentricity: DEFAULT_ECCENTRICITY,
            argPerigee: DEFAULT_ARG_PERIGEE,
            meanAnomaly: DEFAULT_MEAN_ANOMALY,
            satNumForTLE: SAT_NUM_BEACON,
            intlDesigForTLE: intlDesig.trim(),
        };
        logBeaconParamsForDebugging(beaconParams, epochDate, line1, line2, paramsForDebug, functionContext + " - Success");

        return { tle1: line1, tle2: line2, paramsForDebug };

    } catch (error: any) {
        console.error("Fatal error in createTLEStringsFromBeaconParams:", error);
        logBeaconParamsForDebugging(beaconParams, epochDate, null, null, {error: error.message || "Unknown error"}, functionContext + " - Exception");
        return null;
    }
}; 