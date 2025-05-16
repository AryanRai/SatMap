# 🛰️ SatMap - Space Handshakes Hackathon Project 🚀

**Simulating satellite communication links: Beacon 📡 Iridium**

---

## 🌟 Project Overview

SatMap is a React/TypeScript web application developed for the Space Handshakes Hackathon. It simulates a custom "Beacon" satellite orbiting Earth and visualizes its communication "handshakes" with the Iridium satellite constellation over a 24-hour period. The simulation calculates key metrics such as total handshakes, communication blackout periods, and their durations.

This project demonstrates the integration of orbital mechanics calculations, TLE data processing, and geometric communication modeling within a modern web application framework.

**✨ Current Status (Highlight):** The core simulation engine is operational! The Beacon satellite's orbit is dynamically generated from user parameters into a TLE, and it successfully propagates. Initial tests show plausible handshake counts with the Iridium constellation.

---

## 📖 Detailed Technical Documentation

For a deep dive into the project's architecture, algorithms, orbital mechanics, TLE generation process, and simulation logic, please see our comprehensive technical documentation:

➡️ **[View Detailed Technical Docs (DOCS.md)](./DOCS.md)**

---

## 🛠️ Technology Stack

*   **Frontend:** React, TypeScript
*   **Orbital Mechanics:** `satellite.js`
*   **HTTP Requests:** `axios` (for TLE data)
*   **Build Tool:** Create React App
*   **Styling:** (Basic CSS, open for enhancement)

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

## 📝 Summary of Key Milestones & Features

*   **Project Setup:** React/TypeScript project initialized (`create-react-app`).
*   **Core Dependencies:** `satellite.js`, `axios`, `react-simple-maps` integrated.
*   **Custom Typings:** `satellite.d.ts` for `satellite.js`.
*   **Directory Structure:** Organized `src/` with `components`, `services`, `utils`, `types`, etc.
*   **TLE Service:** `tleService.ts` fetches Iridium TLEs from CelesTrak with fallback (Note: CelesTrak has rate limiting).
*   **Orbital Calculations (`orbitCalculation.ts`):
    *   ✅ **Dynamic Beacon TLE Generation:** Successfully converts user-defined orbital parameters (SSO/Non-Polar, altitude, LSTDN/inclination) into valid TLE strings.
    *   ✅ **SatRec Initialization:** Uses `satellite.twoline2satrec` for robust `SatRec` objects.
    *   ✅ **Propagation:** Satellites propagated using SGP4 via `satellite.propagate`.
    *   ✅ **Coordinate Conversion:** ECI to Geodetic transformations.
*   **Geometric Utilities (`geometry.ts`):
    *   Vector math, nadir calculation.
    *   Iridium communication cone modeling.
    *   Point-in-cone check for communication link determination.
*   **Simulation Engine (`simulationEngine.ts`):
    *   Simulates Beacon and Iridium constellation.
    *   Tracks individual handshakes and active communication links per time step.
    *   Calculates communication blackout periods and durations.
*   **User Interface (`OrbitInputForm.tsx`, `App.tsx`, `SatVisualization.tsx`, `SidePanel.tsx`):
    *   Allows user input for Beacon's orbital parameters and simulation settings (FOV, duration, time step).
    *   Displays simulation results (handshake count, blackout stats).
    *   **Interactive 2D Map Visualization (`react-simple-maps`):
        *   Displays satellite ground tracks.
        *   Playback controls: Play, pause, slider, reset.
        *   Configurable trail lengths for satellite paths with a toggle to show/hide trails.
        *   Zoom/Pan controls for the map (+/-, Reset View).
        *   Graticule display (latitude/longitude lines).
        *   Hover tooltips on satellite markers showing ID, Latitude, Longitude, and Altitude.
        *   Dynamic highlighting of active communication links (lines and marker colors).
    *   **Side Panel:**
        *   Opens on Iridium satellite marker click.
        *   Displays detailed handshake history for the selected Iridium satellite.
*   **Styling:** Dark theme with Martian-inspired orange accents. CSS Modules used for component-specific styles (e.g., `SidePanel`).

---

## ✅ TODO List & Next Steps

(Refer to the [Detailed Technical Docs (DOCS.md)](./DOCS.md) for context on some items)

-   [x] **Initial UI for Visualization** (Basic map, tracks, markers implemented)
-   [x] **Playback Controls for Animation** (Play, pause, slider, reset)
-   [x] **Side Panel for Detailed Info** (Shows handshake history)
-   [x] **Hover Tooltips for Satellites**
-   [x] **Visual Indication of Active Links**
-   [x] **Configurable Trail Lengths & Visibility**
-   [x] **Map Zoom/Pan/Reset Controls & Graticules**
-   [x] **Styling for Side Panel and Map Theme**

-   [ ] **Verify Blackout Logic Thoroughly**:
    -   [ ] Test with different Beacon orbital parameters (e.g., lower altitudes) to induce and meticulously verify blackout period calculations.
-   [ ] **Further UI/UX Enhancements (`satmap/src/components/`)**:
    -   [ ] `ResultsDisplay.tsx`: Improve clarity and detail in presenting simulation summary outputs in `App.tsx` (currently basic text).
    -   [ ] Information Display on Map: Consider showing summary of handshakes/blackouts that update *as the animation plays*.
    -   [ ] Visual Cues for Events: Briefly flash markers on handshake initiation.
    -   [ ] Visually indicate overall blackout periods on Beacon's track or with a global indicator.
    -   [ ] Customization: Allow users to toggle visibility of Iridium vs. Beacon tracks, change animation speed.
-   [ ] **TLE Fetching Robustness:**
    -   [ ] Implement local caching for TLE data to reduce CelesTrak API calls and mitigate rate limiting.
    -   [ ] Provide more comprehensive dummy TLE set for offline use.
-   [ ] **State Management (`satmap/src/`)**:
    -   [ ] Evaluate if more advanced state management (React Context, Zustand) is needed as UI complexity grows (currently prop drilling is manageable but could be refactored).
-   [ ] **Styling and User Experience (UX)**:
    -   [ ] Further polish overall application CSS and responsiveness.
-   [ ] **Testing**:
    -   [ ] Add unit tests for critical utility functions (orbital calculations, geometry).
    -   [ ] Consider integration tests for simulation flow.
-   [ ] **Build and Deployment**:
    -   [ ] Ensure smooth `npm run build` process (address any persistent linter/TS path issues if they affect build).
    -   [ ] Plan for potential deployment (e.g., GitHub Pages, Netlify).
-   [ ] **Documentation & Presentation**:
    -   [x] Create detailed technical documentation (`DOCS.md`).
    -   [ ] **Update `DOCS.md`** with all new UI features and simulation output details.
    -   [ ] Prepare video demo and presentation materials for the hackathon submission.

---

**IMPORTANT PROJECT STRUCTURE NOTE:** All source code (`*.ts`, `*.tsx`) should reside within the `satmap/src/` directory. This `README.md` and `DOCS.md` are in the `satmap/` project root.
