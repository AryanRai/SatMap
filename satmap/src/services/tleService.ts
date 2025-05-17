import { TLE } from '../types/orbit';
import axios from 'axios';

// CelesTrak URLs for fetching TLE data.
const IRIDIUM_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium&FORMAT=tle';
const IRIDIUM_NEXT_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-next&FORMAT=tle';

/**
 * Defines the types of Iridium TLE datasets that can be fetched.
 * Used to specify which constellation(s) to include in the simulation.
 */
export type IridiumDatasetType = "IRIDIUM" | "IRIDIUM-NEXT";

/**
 * Fetches TLE (Two-Line Element) data for the Iridium and/or Iridium-NEXT constellations from CelesTrak.
 * This service is part of SatCore's data acquisition capabilities.
 *
 * NOTE: CelesTrak has usage policies. For frequent use during development, consider implementing
 * caching or using a backend proxy to avoid IP bans or service disruption.
 *
 * @param datasetsToFetch An array specifying which datasets to fetch (e.g., ["IRIDIUM", "IRIDIUM-NEXT"]).
 *                        Defaults to fetching both if not specified.
 * @returns A Promise resolving to an array of TLE objects. Returns a fallback TLE if all fetches fail.
 */
export const fetchIridiumTLEs = async (datasetsToFetch: IridiumDatasetType[] = ["IRIDIUM", "IRIDIUM-NEXT"]): Promise<TLE[]> => {
  let allTles: TLE[] = [];
  let hasSuccessfullyFetchedAnyData = false; // Tracks if any TLEs were successfully parsed from any source

  console.log(`[SatCore/TLEService] Requesting TLEs for datasets: ${datasetsToFetch.join(', ')}`);

  for (const dataset of datasetsToFetch) {
    const url = dataset === "IRIDIUM" ? IRIDIUM_TLE_URL : IRIDIUM_NEXT_TLE_URL;
    try {
      console.log(`[SatCore/TLEService] Fetching TLEs from: ${url}`);
      const response = await axios.get<string>(url, { timeout: 10000 }); // Added timeout
      const parsedTles = parseTleFile(response.data);

      if (parsedTles.length > 0) {
        console.log(`[SatCore/TLEService] Successfully fetched and parsed ${parsedTles.length} TLEs for ${dataset}.`);
        allTles = allTles.concat(parsedTles);
        hasSuccessfullyFetchedAnyData = true;
      } else {
        console.warn(`[SatCore/TLEService] Fetched data for ${dataset}, but no valid TLEs were parsed. Response might be empty or malformed.`);
      }
    } catch (error: any) {
      console.error(`[SatCore/TLEService] Error fetching TLEs for ${dataset} from ${url}.`);
      if (error.response) {
        console.error(`  Response Status: ${error.response.status}`);
        console.error(`  Response Data: ${typeof error.response.data === 'string' ? error.response.data.substring(0, 200) + '...' : JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error(`  No response received. Request was made but no response (e.g., network error, timeout).`);
      } else {
        console.error(`  Error message: ${error.message}`);
      }
    }
  }

  // Fallback logic: If NO TLEs were successfully fetched and parsed from ANY source, use a dummy TLE.
  if (!hasSuccessfullyFetchedAnyData && allTles.length === 0) {
    console.warn('[SatCore/TLEService] Fallback: All TLE fetches failed or returned no parsable TLEs. Using dummy TLE data.');
    return [
      {
        name: 'IRIDIUM 1 (FALLBACK)', // Simplified name
        line1: '1 24792U 97020A   24150.50000000  .00000000  00000-0  00000-0 0  9999', // Generic line 1 example
        line2: '2 24792  86.4000   0.0000 0001000   0.0000   0.0000 14.34160000  00006',  // Generic line 2 example for 780km altitude
      },
    ];
  } else if (allTles.length === 0) {
    // This case means at least one request might have technically "succeeded" (e.g., 200 OK with empty/malformed data)
    // but no TLEs were actually parsed. We don't use fallback here to indicate a potential issue with the source data itself.
    console.warn('[SatCore/TLEService] Warning: TLE fetching process completed, but no valid TLEs were ultimately parsed from any source.');
  }

  console.log(`[SatCore/TLEService] Total TLEs collected: ${allTles.length}`);
  return allTles;
};

/**
 * Parses a raw TLE file string (which can contain multiple TLEs) into an array of TLE objects.
 * Handles common TLE file format where each TLE is three lines: Name, Line 1, Line 2.
 * Skips empty lines and attempts to gracefully handle non-TLE lines (e.g., HTML headers from CelesTrak).
 *
 * @param tleFileContent The raw string content of the TLE file.
 * @returns An array of parsed TLE objects.
 */
const parseTleFile = (tleFileContent: string): TLE[] => {
  if (!tleFileContent || typeof tleFileContent !== 'string') {
    console.warn("[SatCore/TLEService] parseTleFile received invalid or empty content.");
    return [];
  }
  const lines = tleFileContent.trim().split(/\r?\n/);
  const tles: TLE[] = [];
  let i = 0;
  while (i < lines.length) {
    const nameLine = lines[i]?.trim(); // Optional chaining for safety

    // Basic check: A TLE name line should not start with '1 ' or '2 '.
    // It also shouldn't be an obviously non-TLE line like an HTML tag.
    if (!nameLine || nameLine.startsWith('1 ') || nameLine.startsWith('2 ') || nameLine.startsWith('<')) {
      i++;
      continue;
    }

    // Check if the next two lines exist and look like TLE line 1 and line 2
    if (i + 2 < lines.length) {
      const line1 = lines[i+1]?.trim();
      const line2 = lines[i+2]?.trim();
      if (line1 && line1.startsWith('1 ') && line1.length === 69 &&
          line2 && line2.startsWith('2 ') && line2.length === 69) {
        tles.push({
          name: nameLine,
          line1: line1,
          line2: line2,
        });
        i += 3; // Successfully parsed a TLE, move to the next set
      } else {
        // Name line was not followed by a valid TLE pair.
        // This could be a header or other non-TLE text in the file.
        // console.warn(`[SatCore/TLEService] Skipping potential name line '${nameLine}' as it's not followed by valid TLE lines.`);
        i++; // Skip this presumed name line and try the next line as a potential name line.
      }
    } else {
      // Not enough lines left for a full TLE set, end parsing.
      break;
    }
  }
  return tles;
};

// Test function (keep commented out for production)
/*
(async () => {
  console.log("[SatCore/TLEService] Running test fetch...");
  const iridiumTles = await fetchIridiumTLEs(["IRIDIUM", "IRIDIUM-NEXT"]);
  // const iridiumTles = await fetchIridiumTLEs(["IRIDIUM"]);
  // const iridiumTles = await fetchIridiumTLEs(["IRIDIUM-NEXT"]);
  // const iridiumTles = await fetchIridiumTLEs([]); // Test empty fetch
  if (iridiumTles.length > 0) {
    console.log(`[SatCore/TLEService] Test: Fetched/Parsed ${iridiumTles.length} Iridium TLEs.`);
    // iridiumTles.forEach(tle => console.log(`  ${tle.name}` L: ${tle.line1.length}, L2: ${tle.line2.length}));
  } else {
    console.log('[SatCore/TLEService] Test: No Iridium TLEs were fetched or parsed.');
  }
})();
*/ 