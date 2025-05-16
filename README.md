# SatMap - Space Handshakes Hackathon Project

This project is a React application in TypeScript built for the Space Handshakes Hackathon. It aims to simulate a satellite (Beacon) orbiting Earth and its communication interactions with the Iridium constellation.

**IMPORTANT PROJECT STRUCTURE NOTE:** All source code (`*.ts`, `*.tsx` files, utility directories like `utils`, `services`, `types`, `constants`, `components`) should reside within the `satmap/src/` directory. The main `README.md` for the project (this file) should be at `satmap/README.md`.

## Summary of Progress So Far

1.  **Project Initialization**:
    *   Set up a new React application named `satmap` using Create React App with the TypeScript template (located in the `satmap/` subdirectory).
2.  **Dependency Installation**:
    *   Installed `satellite.js` for orbital mechanics calculations.
    *   Installed `axios` for making HTTP requests (e.g., to fetch TLE data) and `@types/axios` for TypeScript support.
    *   Noted: TypeScript definitions for `satellite.js` (`@types/satellite.js`) are not currently available in the `@types` registry. Created a custom declaration file `src/types/satellite.d.ts` to provide basic typings for the parts of the library being used.
3.  **Directory Structure (Corrected)**:
    *   Ensured standard project directories (`components`, `services`, `utils`, `types`, `hooks`, `assets`, `constants`) are correctly placed within `satmap/src/`.
4.  **Initial Type Definitions (`satmap/src/types/`)**:
    *   Created `orbit.ts` with initial TypeScript interfaces and enums for orbital parameters, satellite data, and simulation results.
    *   Created `satellite.d.ts` with custom type declarations for `satellite.js`.
5.  **Constants (`satmap/src/constants/`)**: 
    *   Created `physicalConstants.ts` with values for Earth's gravitational parameter (GM), Earth's radius, J2 coefficient, and time conversion factors.
6.  **TLE Fetching Service (`satmap/src/services/tleService.ts`)**:
    *   Implemented an initial version of `fetchIridiumTLEs` to get TLE data from CelesTrak, including basic parsing and a fallback to dummy data for development.
7.  **Orbital Calculation Utilities (`satmap/src/utils/orbitCalculation.ts`)**:
    *   Implemented `initializeSatrecFromTLE`, `propagateSatellite`, `getOrbitTrack`.
    *   Added helper functions: `getJulianDate`, `getSunRaDec`.
    *   **[COMPLETED & VERIFIED]** Replaced experimental direct `SatRec` creation with robust TLE string generation for the Beacon satellite. This involves:
        *   Calculating orbital elements (mean motion, inclination, RAAN for SSO, epoch details in UTC) from user parameters.
        *   Formatting these elements into valid TLE line 1 and line 2 strings.
        *   Using `satellite.twoline2satrec()` to parse these TLEs, ensuring correct `SatRec` initialization.
        *   This has resolved the previous `NaN` propagation errors for the Beacon.
8.  **Geometric Calculation Utilities (`satmap/src/utils/geometry.ts`)**:
    *   Implemented vector math utilities.
    *   Defined constants for communication cone FOVs.
    *   Implemented `getNadirVector`, `isPointInCone`, `createIridiumCone`, and `createBeaconAntennaCones`.
9.  **Simulation Engine (`satmap/src/simulationEngine.ts`)**:
    *   Developed `runSimulation` function that initializes Beacon and Iridium satellites, propagates them over 24 hours, checks for communication using cone geometry, counts handshakes, and tracks blackout periods.
    *   **Initial simulation runs with a 700km Sun-Synchronous Beacon (10.5h LSTDN) show successful propagation and plausible results (e.g., ~508 handshakes, 0 blackouts over 24h).**

## Todo List & Next Steps

-   [x] **Testing & Refinement of Beacon `SatRec` Creation**:
    -   [x] Test if the manually created `SatRec` objects for the Beacon satellite propagate correctly. (Superseded by TLE generation)
    -   [x] Refine calculations if inaccuracies are found. (TLE generation implemented and verified)
-   [ ] **Verify Handshake & Blackout Logic**:
    -   [ ] Review and confirm the handshake counting mechanism in `simulationEngine.ts`.
    -   [ ] Test with different Beacon orbital parameters to induce and verify blackout period calculations.
-   [ ] **UI Components (`satmap/src/components/`)**:
    -   [x] `OrbitInputForm.tsx`: To select orbit type and input parameters.
        -   [ ] Basic structure and state for form inputs.
        -   [ ] onChange handlers for inputs.
        -   [ ] onSubmit handler to trigger simulation.
    -   [ ] `SimulationControls.tsx`: Buttons to Start, Pause, Reset the simulation (may be part of a main App component initially).
    -   [ ] `ResultsDisplay.tsx`: To clearly present simulation outputs.
    -   [ ] `Visualization.tsx` (Ambitious Stretch Goal):
        -   [ ] Choose a visualization approach (e.g., 2D map, simplified 3D, or a library like CesiumJS, Deck.gl, react-globe.gl).
        -   [ ] Display orbits of the Beacon and Iridium satellites.
        -   [ ] Visually indicate communication links/cones when active.
-   [ ] **State Management (`satmap/src/`)**:
    -   [ ] Implement state management (e.g., React Context or Zustand) to handle user inputs, simulation state, simulation results, and loading states across components.
    -   [ ] Connect `OrbitInputForm` to trigger `runSimulation` and update application state with results.
-   [ ] **Main Application Component (`satmap/src/App.tsx`)**:
    -   [ ] Integrate `OrbitInputForm`, `ResultsDisplay`, and potentially `Visualization`.
    -   [ ] Manage overall application flow.
-   [ ] **Styling and User Experience (UX)**:
    -   [ ] Apply CSS for a clean, intuitive, and aesthetically pleasing interface.
    -   [ ] Ensure the application is responsive and easy to use.
-   [ ] **Testing**:
    -   [ ] Add unit tests for utility functions.
    -   [ ] Consider integration tests.
-   [ ] **Build and Deployment**:
    -   [ ] Ensure the application can be built (`npm run build`).
    -   [ ] Plan for deployment.
-   [ ] **Documentation & Presentation**:
    -   [ ] Prepare video demo and presentation materials.

## Getting Started with Development (Post-Structure Correction)

1.  Ensure all project code (including this `README.md`) is within the `satmap/` directory. The `src/` directory directly under `satmap/` should contain all TypeScript source files.
2.  Navigate to the `satmap` directory: `cd satmap`
3.  Install dependencies (if not already done): `npm install`
4.  Start the development server: `npm start` (this will now correctly serve the app from `satmap/src/App.tsx`)

This should open the app in your default web browser, usually at `http://localhost:3000`.
