# SatMap - Detailed Technical Documentation

This document provides a more in-depth look at the technical aspects, algorithms, and logic used in the SatMap project.

## Table of Contents

1.  [Project Core Objective](#project-core-objective)
2.  [Key Technologies](#key-technologies)
3.  [Orbital Mechanics & Satellite Propagation](#orbital-mechanics--satellite-propagation)
    *   [Satellite.js Library](#satellitejs-library)
    *   [Two-Line Element Sets (TLEs)](#two-line-element-sets-tles)
    *   [Beacon Satellite TLE Generation](#beacon-satellite-tle-generation)
    *   [Propagation Process](#propagation-process)
4.  [Communication Simulation](#communication-simulation)
    *   [Iridium Constellation](#iridium-constellation)
    *   [Beacon Antenna & Iridium Cones](#beacon-antenna--iridium-cones)
    *   [Line-of-Sight & Cone Check](#line-of-sight--cone-check)
5.  [Simulation Engine Logic](#simulation-engine-logic)
    *   [Time Stepping](#time-stepping)
    *   [Handshake Logic](#handshake-logic)
    *   [Blackout Period Calculation](#blackout-period-calculation)
    *   [Simulation Outputs for UI](#simulation-outputs-for-ui)
6.  [User Interface and Visualization](#user-interface-and-visualization)
    *   [`App.tsx`](#apptsx)
    *   [`OrbitInputForm.tsx`](#orbitinputformtsx)
    *   [`SatVisualization.tsx`](#satvisualizationtsx)
    *   [`SidePanel.tsx`](#sidepaneltsx)
7.  [Coordinate Systems](#coordinate-systems)
8.  [Source Code Structure Highlights](#source-code-structure-highlights)
9.  [Potential Future Enhancements](#potential-future-enhancements)

---

## 1. Project Core Objective

The primary goal is to simulate a custom "Beacon" satellite orbiting Earth and determine its communication handshakes with the Iridium satellite constellation over a configurable period. The simulation also calculates total communication blackout duration and statistics and visualizes the process on an interactive map.

## 2. Key Technologies

*   **React:** For building the user interface.
*   **TypeScript:** For static typing and improved code quality.
*   **Satellite.js:** A JavaScript library for orbital mechanics calculations, primarily SGP4/SDP4 propagation from TLEs.
*   **Axios:** For fetching Iridium TLE data from CelesTrak.
*   **React Simple Maps:** For rendering the 2D map visualization.
*   **Create React App:** As the foundation for the React project structure.
*   **CSS Modules:** For component-scoped styling (e.g., `SidePanel`).

## 3. Orbital Mechanics & Satellite Propagation

### Satellite.js Library

This project heavily relies on `satellite.js` to perform complex orbital calculations. Since official TypeScript type definitions (`@types/satellite.js`) are unavailable, a custom declaration file (`src/types/satellite.d.ts`) was created to provide basic typings for the functions and objects utilized from the library (e.g., `SatRec`, `twoline2satrec`, `propagate`, `eciToGeodetic`, `gstime`).

### Two-Line Element Sets (TLEs)

TLEs are a standard format for distributing orbital data of Earth-orbiting satellites. Each TLE consists of two lines of text that encode the orbital elements at a specific epoch.

*   **Iridium TLEs:** Fetched from CelesTrak using the `tleService.ts`. *Note: CelesTrak implements rate limiting, so frequent fetches during development might lead to temporary IP blocks.*
*   **Beacon TLE:** Generated dynamically based on user-defined orbital parameters.

### Beacon Satellite TLE Generation

Since the Beacon satellite's orbit is user-defined (Sun-Synchronous or Non-Polar with parameters like altitude, LSTDN/inclination), its TLE cannot be fetched. Instead, `src/utils/orbitCalculation.ts` implements logic to generate valid TLE strings:

1.  **Epoch Calculation:** The simulation start time is used as the epoch. UTC year, day of the year, and fractional day are calculated.
2.  **Mean Motion (n):** Calculated from the semi-major axis (Earth radius + altitude) using Kepler's third law:  
    `n = sqrt(GM_Earth / a^3)` (radians/second), then converted to revolutions/day.
3.  **Inclination (i):**
    *   For Non-Polar orbits: Directly taken from user input.
    *   For Sun-Synchronous Orbits (SSO): Calculated to achieve the required nodal precession rate. The formula involves the semi-major axis (a), eccentricity (e, assumed near-circular), Earth's J2 perturbation coefficient, Earth's equatorial radius (R_eq), and the mean motion (n).
4.  **Right Ascension of the Ascending Node (RAAN or Omega):
    *   For Non-Polar orbits: User input (optional, defaults to 0 degrees).
    *   For SSO: Calculated based on the desired Local Solar Time at the Descending Node (LST_DN) and the Sun's Right Ascension (alpha_sun) at the epoch.
5.  **Eccentricity (e):** Assumed to be near-circular (e.g., 0.0001) for simplicity in TLE generation for the Beacon.
6.  **Argument of Perigee (omega) & Mean Anomaly (M):** Typically set to 0.0 for new, circular orbits.
7.  **Other TLE Fields:** BSTAR drag term, ndot, nddot are set to zero. Satellite number is a dummy (e.g., 99999), international designator is generated based on epoch year.
8.  **Checksum:** Calculated for each line.

These elements are then formatted precisely into TLE line 1 and line 2 strings.

### Propagation Process

1.  **Initialization:** `satellite.twoline2satrec(tleLine1, tleLine2)` parses the TLEs into `SatRec` objects.
2.  **Propagation:** At each time step, `satellite.propagate(satrec, date)` predicts the satellite's state vector (position and velocity) in Earth-Centered Inertial (ECI) coordinates.
3.  **Coordinate Conversion:** The ECI position is then converted to Geodetic coordinates (latitude, longitude, altitude using WGS84 ellipsoid model) via `satellite.eciToGeodetic(eciPosition, gmst)`.

## 4. Communication Simulation

### Iridium Constellation

The simulation uses TLE data for the active Iridium constellation. Each Iridium satellite is modeled as a potential communication partner for the Beacon.

### Beacon Antenna & Iridium Cones

*   **Iridium Satellite Communication Cone:** Each Iridium satellite is assumed to have a communication payload with a conical field of view (FOV) directed towards nadir. The FOV half-angle is derived from the `iridiumFovDeg` parameter in the `SimulationConfig`.
*   **Beacon Satellite Communication:** The Beacon is considered a point. It communicates if it falls within any Iridium satellite's communication cone. The Beacon's own antenna FOV (`beaconFovDeg` in `SimulationConfig`) is defined but not currently used in the geometric check for handshakes (i.e., Beacon is assumed omnidirectional for receiving or its FOV is much larger than Iridium's effective area at Beacon's position).

### Line-of-Sight & Cone Check

The function `isPointInCone(pointEci, cone)` in `src/utils/geometry.ts` determines if the Beacon (`pointEci`) is within a given Iridium `cone` by calculating the angle between the vector from the cone apex (Iridium) to the Beacon and the cone's axis vector.

## 5. Simulation Engine Logic

Located in `src/simulationEngine.ts` (`runSimulation` function).

The `runSimulation` function now accepts a `SimulationConfig` object, which includes:
*   `beaconParams`: Orbital parameters for the Beacon.
*   `iridiumFovDeg`: Iridium antenna Field of View in degrees.
*   `beaconFovDeg`: Beacon antenna Field of View in degrees.
*   `simulationDurationHours`: Total simulation duration.
*   `simulationTimeStepSec`: Time step for propagation.

### Time Stepping

The simulation runs for the configured duration with the specified time step. In each step:

1.  The current time is incremented.
2.  The Beacon satellite and all Iridium satellites are propagated.
3.  Communication checks are performed.

### Handshake Logic

A handshake is defined as the moment a *new* communication link is established between the Beacon and a specific Iridium satellite.

*   `previousConnectedIridiumSatIds`: A `Set` storing IDs of Iridium satellites the Beacon was connected to in the *previous* time step.
*   `currentConnectedIridiumSatIds`: A `Set` storing IDs of Iridium satellites the Beacon is connected to in the *current* time step (i.e., Beacon is within their communication cone).
*   **Condition:** A handshake with `IridiumX` is registered if `IridiumX` is in `currentConnectedIridiumSatIds` BUT was NOT in `previousConnectedIridiumSatIds`.
*   **Output:** Individual handshake events (timestamp, satellite IDs, positions) are stored in the `handshakeLog` array within `SimulationResults`.

### Blackout Period Calculation

A blackout occurs when the Beacon is not in communication with *any* Iridium satellite. The logic for calculating start, end, and duration of these periods remains the same, stored in `blackoutPeriods`.

### Simulation Outputs for UI

The `SimulationResults` object returned by `runSimulation` now includes:
*   `totalHandshakes`: Total count of new link establishments.
*   `handshakeLog: Handshake[]`: An array logging each individual handshake event with timestamps and participant details.
*   `activeLinksLog: Array<Set<string>>`: An array where each element corresponds to a time step in the simulation. Each element is a `Set` containing the IDs of Iridium satellites actively communicating with the Beacon at that specific time step. This is crucial for visualizing active links dynamically.
*   `blackoutPeriods: BlackoutPeriod[]`: List of blackout events.
*   `totalBlackoutDuration`, `averageBlackoutDuration`, `numberOfBlackouts`: Statistics for blackouts.
*   `beaconTrack: SatellitePosition[]`, `iridiumTracks: { [satelliteId: string]: SatellitePosition[] }`: Full ground track data for visualization.

## 6. User Interface and Visualization

The application features an interactive UI allowing users to define simulation parameters and view results on a 2D map.

### `App.tsx`

The main React component. It:
*   Manages the overall application state (input parameters, simulation results, loading/error states).
*   Renders the `OrbitInputForm` to collect user settings.
*   Triggers the simulation via `simulationEngine.ts` upon form submission.
*   Passes the `SimulationResults` to the `SatVisualization` component.
*   Displays basic textual simulation results (total handshakes, blackout info).

### `OrbitInputForm.tsx`

A React component that provides a form for users to input:
*   **Beacon Orbit Parameters:** Type (Sun-Synchronous or Non-Polar), Altitude, and LSTDN (for SSO) or Inclination & RAAN (for Non-Polar).
*   **Simulation Configuration:**
    *   Iridium Antenna FOV (degrees).
    *   Beacon Antenna FOV (degrees).
    *   Simulation Duration (hours).
    *   Simulation Time Step (seconds).

### `SatVisualization.tsx`

This component is responsible for rendering the interactive 2D map visualization of the simulation using `react-simple-maps`.

*   **Map Display:** Renders a Mercator projected world map with graticules (latitude and longitude lines).
*   **Satellite Tracks:** Displays ground tracks for the Beacon and all simulated Iridium satellites. Trail lengths are configurable via UI controls, and trails can be toggled on/off.
*   **Satellite Markers:** Shows current positions of all satellites as markers on the map.
*   **Playback Controls:**
    *   Play, Pause/Restart, Reset buttons.
    *   A time slider to scrub through the simulation timeline.
    *   The animation updates satellite marker positions and progressively draws their trails based on the `currentTimeIndex`.
    *   Displays the current simulation timestamp and step count.
*   **Interactivity & Information:**
    *   **Zoom/Pan:** The map supports zooming and panning. UI buttons for Zoom In (+), Zoom Out (-), and Reset View are provided.
    *   **Hover Tooltips:** Hovering over a satellite marker displays a tooltip with its ID, current Latitude, Longitude, and Altitude.
    *   **Click for Details:** Clicking on an Iridium satellite marker opens the `SidePanel`.
*   **Dynamic Styling & Links:**
    *   Actively communicating Iridium satellites (those with a current link to the Beacon, derived from `activeLinksLog`) have their markers and tracks highlighted (e.g., with a green color).
    *   A line is drawn on the map between the Beacon and any Iridium satellite it is actively communicating with at the current time step.
*   **Theme:** Uses a dark theme with Martian-inspired orange accents. Map geography colors are styled to match.

### `SidePanel.tsx`

A React component styled using CSS Modules (`SidePanel.module.css`).
*   **Activation:** Appears when an Iridium satellite marker is clicked on the map.
*   **Content:** Displays the selected Iridium satellite's ID and a detailed history of its handshake events with the Beacon (timestamp, and positions of both satellites at the time of handshake), using data from `simulationResults.handshakeLog`.
*   Includes a close button.

## 7. Coordinate Systems

*   **ECI (Earth-Centered Inertial):** Primary system for orbital propagation. Origin at Earth's center, axes fixed relative to distant stars.
*   **Geodetic:** Latitude, longitude, altitude (WGS84). Used for map display.

## 8. Source Code Structure Highlights

*   `satmap/src/types/`: TypeScript interfaces and enums (`orbit.ts`, `satellite.d.ts`).
*   `satmap/src/constants/`: Physical constants (`physicalConstants.ts`).
*   `satmap/src/utils/`: Core calculation utilities (`orbitCalculation.ts`, `geometry.ts`).
*   `satmap/src/services/`: External data services (`tleService.ts`).
*   `satmap/src/simulationEngine.ts`: Main simulation logic.
*   `satmap/src/components/`: React UI components (`App.tsx`, `OrbitInputForm.tsx`, `SatVisualization.tsx`, `SidePanel.tsx`). Includes CSS module files like `SidePanel.module.css`.
*   `satmap/src/App.css`: Global styles and theme.

## 9. Potential Future Enhancements

*   **UI/UX Polish:**
    *   Further refine styling of `SidePanel` and overall application CSS.
    *   Improve responsiveness for different screen sizes.
    *   More dynamic display of simulation summary data (e.g., handshakes/blackouts updating during animation).
    *   Visual cues for events (e.g., flashing marker on handshake initiation).
    *   Allow users to toggle visibility of specific satellite tracks or types.
    *   Option to change animation speed.
*   **TLE Data Management:**
    *   Implement client-side caching for TLE data (e.g., using `localStorage`) to reduce CelesTrak API calls and handle rate-limiting.
    *   Expand the built-in dummy TLE set for more robust offline/fallback operation.
*   **Simulation Fidelity:**
    *   More sophisticated antenna patterns.
    *   Consideration of atmospheric drag and other perturbations.
*   **Testing:**
    *   Comprehensive unit tests for utility functions.
    *   Integration tests for simulation and UI flows.
*   **State Management:** Evaluate more advanced state management (React Context, Zustand) if prop drilling becomes cumbersome.
*   **Build/Deployment:** Address any persistent TypeScript module resolution issues if they impact the build process. Plan for deployment.

---
*This document is intended to provide a high-level technical overview. For precise implementation details, please refer to the source code.* 

---

## V2 Roadmap

- [x]  map blank as main page focus add the details when click simulate keep this on top and preloaded without any satellite data and then simulation resuluts below that and config below that
- [x]  ui refresh use more animations if u can and more futuristic starwars style tesla spacex clean apple style but futuristic
    - [x]  make the styling a bit consistent with the orange black and grey i dont like the current blue and yellow color u used for the sim resulted and current simulation results used and there is some dark blue background. if u use different colors use some subtle colors to keep it in line with the current ones
    - [x]  make beacon pulsate and make that a toggle, for attentention grabbing
    - [x]  make the yellow trail behind the beacon also disablable
    
- [x]  make a side menu togglable such that it always displays (if toggled) or if u go to left side of window it always displays current connections and details at that moment
    - [x]  the hide show button comes over the panel and looks a bit weird becuase its on some text and also the scrollbar is light theme but the main is dark, can we have it dark
    - [x]  change the background color of the panel to a grey tone rather than dark blue it seems not onsistent with the style also the Beacon Satellite Orbit Parameters and Beacon Satellite Orbit Parameters has a blue background change that to a tone of grey
    - [x]  do a creative scollbar
    - [x]  show hide status panel-toggle-button is still above the panel in z axis looks weird
    - [x]  SimulationConfigDisplay_configDisplayContainer, SimulationResultsDisplay_resultsDisplayContainer, main-content-area needs to be in a grey background tone
    - [x]  add animation to open panel and change button text to something like hover left/open active comms panel
    - [x]  clicking any satellite inside the panel opens details relating to panel, we already have the details from clicking on the map it can open it
    - [x]  add 2 sections like currently connected, prevously connected and never connected
    - [x]  Previosly connected seems blank is that supposed to be like the, previously connected are sats that at somepoint of time were connected and now arent
    - [x]  make the details menu that shows details regarding a satellite movable by dragging it aroud set its z index above most else so i can drag it to anywhere i want on the screen since it comes on top of the actual map
    - [x]  make the sat details panel minimizable
    - [x]  when invoked from map, keep the sat details close to the map when invoked from the side panel keep it closed to that
    - [x]  the formatting of how data is presented inside sat details panel can be impoved right now its just poorly formatted text
    - [x]  since the text inside the sat details panel is copyable/draggable, dragging the panel posses a challenge maybe make a handle
    - [x]  also make a copy paste mode and have it disabled by default so i can copy data from it
    - [x]  fix styling for copy paste mode and minimize button on the sat details menu
    - [x]  when invoked sat details from the panel it is over the simulation results so possible to move it elsewhere?
    - [x]  also when i open or close the panel it automatically opens the details menu for some reason
    - [ ]  console is open by default it should be closed
    
       
    
- [x]  make a console on right side same as the hover panel that shows raw console data
- [ ]  introduce Glassmorphic ui elements apple or openai sora types like keep the theme colors the same
- [ ]  Realtime mode that simulates in realtime
- [ ]  Implement cashe toggle to retain previous data so i dont spam the iridium api
- [ ]  running sim please wait replace this with an animation
- [ ]  intro and how to use
- [ ]  some artifacts on the map when i click it
- [ ]  default trails on map off and console disabled
- [ ]  simulation start time formatting
- [ ]  add docs and readme for v2 comments v2 includes everything until 3d maps and map types

*Note: V2 encompasses all features and improvements up to, but not including, the 3D map visualizations and advanced map type functionalities (which are part of V3).* 

## V3 Roadmap

- [x]  new mode to 3d map of earth and sats, keep the 2d map too
- [x]  on actual map have a toggle to show communication cone to show fov of beacon and iridium on map
- [x]  by default have the 3d blank earth in 3d view instead of just displaying a a msg saying run simulation to see earth
- [ ]  timelapse mode
- [x]  all features from 2d view to be implemented in 3d
- [ ]  alignment is 2d map texture alinged with 3d map texture
- [x]  make date time manually setable 