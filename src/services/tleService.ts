import { TLE } from '../types/orbit';
import axios, { AxiosError, AxiosResponse } from 'axios';

// CelesTrak URL for Iridium TLEs
const IRIDIUM_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium&FORMAT=tle';

/**
 * Fetches TLE data for the Iridium constellation.
 * 
 * NOTE: Be mindful of CelesTrak's usage policies to avoid IP bans.
 * Consider caching or using a proxy for frequent requests during development.
 */
export const fetchIridiumTLEs = async (): Promise<TLE[]> => {
  try {
    // IMPORTANT: CelesTrak might block direct client-side requests due to CORS.
    // This might need to be fetched via a backend proxy in a production environment.
    const response: AxiosResponse<string> = await axios.get(IRIDIUM_TLE_URL);
    const tleData: string = response.data;
    return parseTleFile(tleData);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error fetching Iridium TLEs:', axiosError.isAxiosError ? axiosError.message : error);
    if (axiosError.response) {
      console.error('Status:', axiosError.response.status);
      console.error('Data:', axiosError.response.data);
    }
    
    console.warn('Falling back to dummy TLE data.');
    // Fallback to a known Iridium satellite TLE
    return [
      {
        name: 'IRIDIUM 140 (FALLBACK)',
        line1: '1 25879U 99046B   24137.58611841  .00000105  00000+0  48098-4 0  9997',
        line2: '2 25879  86.3999 218.5490 0001663  80.1715 280.0000 14.34159983269165',
      },
    ];
  }
};

/**
 * Parses a raw TLE file string (multiple TLEs) into an array of TLE objects.
 */
const parseTleFile = (tleFileContent: string): TLE[] => {
  const lines = tleFileContent.trim().split(/\r?\n/);
  const tles: TLE[] = [];
  let i = 0;
  while (i < lines.length) {
    const nameLine = lines[i].trim();
    // Skip empty lines or lines that are not TLE line1/line2 (e.g. page titles from celestrak)
    if (!nameLine || nameLine.startsWith('1 ') || nameLine.startsWith('2 ')) {
      i++;
      continue;
    }

    // We expect line 1 and line 2 to follow the name line
    if (i + 2 < lines.length) {
      const line1 = lines[i+1].trim();
      const line2 = lines[i+2].trim();
      if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
        tles.push({
          name: nameLine,
          line1: line1,
          line2: line2,
        });
        i += 3; // Move to the next potential TLE set
      } else {
        // Name line was not followed by a valid TLE pair, skip name line and try next
        i++;
      }
    } else {
      // Not enough lines left for a full TLE set
      break;
    }
  }
  return tles;
};

// Example of how you might fetch and use it (optional, for testing within this file):
/*
(async () => {
  const iridiumTles = await fetchIridiumTLEs();
  if (iridiumTles.length > 0) {
    console.log(`Fetched/Parsed ${iridiumTles.length} Iridium TLEs. First one:`, iridiumTles[0]);
  } else {
    console.log('No Iridium TLEs were fetched or parsed.');
  }
})();
*/ 