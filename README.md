# <img src="./public/icon.png" width="30" height="30" alt="SatMap Icon"> 🛰️ SatMap - Space Handshakes Hackathon Project (V1.0) 🚀

**Simulating satellite communication links: Beacon 📡 Iridium**

---

## 🌟 Project Overview (V1.0)

SatMap is a React/TypeScript web application, now at **Version 1.0**, developed for the Space Handshakes Hackathon. It simulates a custom "Beacon" satellite orbiting Earth and visualizes its communication "handshakes" with the Iridium satellite constellation over a user-defined period. The simulation calculates key metrics such as total handshakes, communication blackout periods, and their durations.

Users can define the Beacon satellite's orbit type (Sun-Synchronous or Non-Polar) and its specific parameters (altitude, LST, inclination). The application dynamically generates a valid Two-Line Element set (TLE) for the Beacon based on these inputs, a critical feature for realistic custom orbit simulation.

This project demonstrates the integration of orbital mechanics calculations (using `satellite.js`), TLE data processing, dynamic TLE generation, and geometric communication modeling within a modern web application framework, culminating in an interactive 2D map visualization.

**✨ V1.0 Highlight:** The core simulation engine (`SatCore`) is robust and operational. The Beacon satellite's orbit is dynamically and correctly generated from user parameters into a valid TLE, enabling accurate propagation. The UI (`SatSimUI`) allows comprehensive configuration and detailed visualization of the simulation, including satellite tracks, active links, and handshake events. Critical bugs in TLE generation have been resolved, ensuring stable simulation runs.

---

## 📖 Detailed Technical Documentation

For a deep dive into the project's architecture, algorithms, orbital mechanics, the dynamic TLE generation process, and detailed simulation logic, please see our comprehensive technical documentation:

➡️ **[View Detailed Technical Docs (DOCS.md)](./DOCS.md)**

---

## 🛠️ Technology Stack

*   **Core Logic (`SatCore`):** TypeScript, `satellite.js` (for orbital mechanics)
*   **Frontend (`SatSimUI`):** React, TypeScript
*   **Data Visualization:** `react-simple-maps`
*   **HTTP Requests:** `axios` (for fetching Iridium TLEs from CelesTrak)
*   **Build Tool:** Create React App (Vite recommended for future projects)
*   **Styling:** CSS (global styles, component-specific CSS Modules e.g., `SidePanel.module.css`), Dark Theme

---
## 🧠 Core Logic Flow

The simulation process in SatMap follows these key steps:

1.  **User Input (`OrbitInputForm.tsx`):** The user specifies the Beacon satellite's desired orbital parameters (type, altitude, LST or inclination) and general simulation settings (FOV for Iridium/Beacon, simulation duration, time step, Iridium datasets to use).
2.  **Beacon TLE Generation (`orbitCalculation.ts`):** Based on the user's parameters and the chosen epoch (simulation start time), SatMap dynamically calculates the necessary orbital elements and constructs valid TLE Line 1 and Line 2 strings for the Beacon satellite. This includes calculating mean motion, RAAN (derived for SSO, user-defined or default for Non-Polar), and ensuring correct formatting and checksums.
3.  **Iridium TLE Fetching (`tleService.ts`):** TLE data for the selected Iridium constellation(s) (original and/or NEXT) is fetched from CelesTrak. A fallback mechanism provides dummy TLEs if the live fetch fails.
4.  **Satellite Initialization (`orbitCalculation.ts`, `simulationEngine.ts`):** Both the dynamically generated Beacon TLE and the fetched Iridium TLEs are parsed into `SatRec` objects using `satellite.js`, making them ready for propagation.
5.  **Time-Step Propagation (`simulationEngine.ts`, `orbitCalculation.ts`):** The simulation iterates through time. At each time step:
    *   The ECI (Earth-Centered Inertial) position and velocity of the Beacon and all relevant Iridium satellites are calculated using the SGP4 propagator in `satellite.js`.
    *   Geodetic coordinates (latitude, longitude, altitude) are derived for visualization.
6.  **Communication Link Detection (`simulationEngine.ts`, `geometry.ts`):**
    *   For each Iridium satellite, a nadir-pointing communication cone is defined based on its ECI position and the user-specified Iridium FOV.
    *   The Beacon's ECI position is checked against each Iridium satellite's communication cone using a point-in-cone geometric test.
7.  **Handshake & Blackout Logging (`simulationEngine.ts`):**
    *   A **handshake** is logged when the Beacon enters the communication cone of an Iridium satellite it wasn't previously connected to.
    *   A **blackout period** begins when the Beacon is not within any Iridium satellite's communication cone and ends when a connection is re-established.
8.  **Results Aggregation & Visualization (`App.tsx`, `SatVisualization.tsx`):**
    *   Total handshakes, blackout counts, and durations are calculated.
    *   Satellite tracks, active communication links, and handshake events are visually rendered on an interactive 2D map. A side panel provides details on selected satellites.

---
## 🖼️ Sneak Peek

Here's a glimpse of SatMap in action:

**Main Application View & Input Form:**
![Main Page Layout](./public/MainPage.png)

**Configuring Simulation Parameters:**
![Parameter Settings](./public/ParametersSettings.png)

**Simulation Map Visualization:**
![Basic Map View](./public/Map.png)

**Map with Trails and Satellite Names:**
![Map with Trails and Names](./public/MapWithTrailandNames.png)

**Simulation Results Summary:**
![Simulation Results Display](./public/SimResults.png)

**Detailed Satellite Information (Side Panel):**
![Side Menu with Satellite Details](./public/SideMenu.png)


---

## 🚀 Getting Started

1.  **Clone the Repository** (if you haven't already).
2.  **Navigate to Project Root:** Ensure your terminal is in the `satmap/` directory (this project's root, containing this README).
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
4.  **Start the Development Server:**
    ```bash
    npm start
    ```
    This will open the app in your default web browser, usually at `http://localhost:3000`.

---

## 📝 Summary of Key Milestones & Features (V1.0)

*   **Project Setup:** React/TypeScript project initialized (`create-react-app`).
*   **Core Dependencies:** `satellite.js`, `axios`, `react-simple-maps` integrated.
*   **Custom Typings:** `satellite.d.ts` created and refined for `satellite.js`.
*   **Directory Structure:** Well-organized `src/` with `components`, `services`, `utils`, `types`, `constants`, `hooks`.
*   **TLE Service (`tleService.ts`):**
    *   Fetches Iridium TLEs from CelesTrak for user-selectable datasets (IRIDIUM, IRIDIUM-NEXT, or both).
    *   Includes robust fallback to dummy TLE data.
    *   Improved TLE parsing and error handling.
*   **Orbital Calculations (`orbitCalculation.ts`):**
    *   ✅ **Dynamic Beacon TLE Generation:** Successfully converts user-defined orbital parameters (SSO/Non-Polar, altitude, LSTDN/inclination) into valid, correctly formatted TLE strings with accurate checksums. This is a cornerstone feature of SatMap.
    *   ✅ **SatRec Initialization:** Uses `satellite.twoline2satrec` for robust `SatRec` objects from TLEs.
    *   ✅ **Propagation:** Satellites propagated using SGP4 via `satellite.propagate`.
    *   ✅ **Coordinate Conversion:** ECI to Geodetic transformations for positions.
*   **Geometric Utilities (`geometry.ts`):**
    *   Standard vector math operations.
    *   Nadir vector calculation for cone orientation.
    *   Iridium communication cone modeling based on user-defined FOV.
    *   Robust point-in-cone check for determining communication link presence.
*   **Simulation Engine (`simulationEngine.ts`):**
    *   Orchestrates the simulation over the specified duration and time step.
    *   Initializes and propagates Beacon (from dynamic TLE) and Iridium satellites.
    *   Tracks individual handshakes (Beacon entering a *new* Iridium cone).
    *   Tracks active communication links between Beacon and Iridium satellites at each time step.
    *   Calculates total handshakes, number of blackouts, total and average blackout durations.
    *   Logs full satellite tracks (`beaconTrack`, `iridiumTracks`) and `activeLinksLog` for visualization.
*   **User Interface (`App.tsx`, `OrbitInputForm.tsx`, `SatVisualization.tsx`, `SidePanel.tsx`):**
    *   **Comprehensive Input Form (`OrbitInputForm.tsx`):**
        *   User selection of Beacon orbit type (Sun-Synchronous/Non-Polar).
        *   Inputs for altitude, LST (for SSO), inclination (for Non-Polar).
        *   Inputs for Iridium FOV, Beacon FOV (currently for future use in bi-directional checks), simulation duration, and time step.
        *   Selection of Iridium datasets (IRIDIUM, IRIDIUM-NEXT, or both).
    *   **Main Application (`App.tsx`):**
        *   Manages global state (simulation results, loading, errors).
        *   Displays simulation summary (total handshakes, blackout statistics).
    *   **Interactive 2D Map Visualization (`SatVisualization.tsx` using `react-simple-maps`):**
        *   Displays satellite ground tracks on a world map.
        *   Playback controls: Play, pause, restart, animation progress slider.
        *   Time display synchronized with simulation progress.
        *   Configurable satellite trail lengths with a toggle to show/hide trails.
        *   Map navigation: Zoom In, Zoom Out, Reset View.
        *   Graticule display (latitude/longitude grid).
        *   Persistent satellite name labels (toggleable).
        *   Dynamic highlighting of active communication links (lines between Beacon and connected Iridium satellites, and marker color changes).
        *   Markers for handshake events on the Beacon's track.
    *   **Side Panel (`SidePanel.tsx`):**
        *   Opens on satellite marker click.
        *   Displays selected satellite's name.
        *   Shows current status: Latitude, Longitude, Altitude.
        *   For Iridium satellites, shows if currently in active link with Beacon.
        *   Lists detailed handshake history (timestamp, positions) for the selected satellite with the Beacon (or all handshakes if Beacon is selected).
*   **Styling:** Consistent dark theme implemented. Uses global CSS and component-scoped CSS Modules (e.g., `SidePanel.module.css`) for maintainability.

---

## ✅ V1.0 Achievements & Next Steps

**V1.0 focused on establishing a stable core simulation and a feature-rich visualization. Key achievements include:**
*   Reliable dynamic TLE generation for custom Beacon orbits.
*   Accurate simulation of handshakes and blackout periods.
*   An interactive and informative 2D map visualization with comprehensive controls.
*   A clean and well-commented codebase (both SatCore and SatSimUI).

**Future Enhancements (Post-Hackathon):**

*   **Performance & Optimization:**
    *   For very long simulations or many satellites, explore optimizations (e.g., Web Workers for simulation thread).
*   **Advanced Visualizations:**
    *   3D visualization mode (e.g., using `three.js` or `deck.gl`).
    *   More detailed visual cues for events (e.g., brief flash on handshake).
    *   Visually indicate overall blackout periods on Beacon's track or with a global indicator on the timeline.
*   **User Experience (UX) & UI Polish:**
    *   `ResultsDisplay`: Enhance presentation of simulation summary in `App.tsx`.
    *   More granular customization (e.g., toggle individual satellite tracks, change animation speed).
    *   Improved styling and responsiveness across devices.
*   **TLE Fetching & Management:**
    *   Implement local caching for TLE data (e.g., using `localStorage` or `IndexedDB`) to reduce CelesTrak API calls.
    *   Provide a more comprehensive offline dummy TLE set.
*   **Simulation Logic Enhancements:**
    *   Option for bi-directional cone checks (using Beacon's FOV and antenna pointing).
    *   Model different antenna patterns or gain.
    *   Incorporate atmospheric effects or basic link budget considerations (highly advanced).
*   **State Management:**
    *   Evaluate if more advanced state management (React Context for specific shared states, Zustand, or Redux Toolkit) is beneficial as features expand.
*   **Testing:**
    *   Add unit tests for critical utility functions (orbital calculations, geometry, TLE generation).
    *   Implement integration tests for the simulation flow.
    *   Consider end-to-end tests for UI interactions.
*   **Build and Deployment:**
    *   Streamline `npm run build` process.
    *   Explore deployment options (e.g., GitHub Pages, Netlify, Vercel).
*   **Documentation:**
    *   Keep `DOCS.md` updated with any new significant features or architectural changes.
    *   Prepare a comprehensive user guide if the application evolves into a tool for broader use.

---

**IMPORTANT PROJECT STRUCTURE NOTE:** All source code (`*.ts`, `*.tsx`) should reside within the `satmap/src/` directory. This `README.md` and `DOCS.md` are in the `satmap/` project root.
