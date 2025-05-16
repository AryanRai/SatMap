# SatMap - Space Handshakes Hackathon Project

This project is a React application in TypeScript built for the Space Handshakes Hackathon. It aims to simulate a satellite (Beacon) orbiting Earth and its communication interactions with the Iridium constellation.

## Summary of Progress So Far

1.  **Project Initialization**:
    *   Set up a new React application named `satmap` using Create React App with the TypeScript template.
2.  **Dependency Installation**:
    *   Installed `satellite.js` for orbital mechanics calculations.
    *   Installed `axios` for making HTTP requests (e.g., to fetch TLE data).
    *   Noted: TypeScript definitions for `satellite.js` (`@types/satellite.js`) are not currently available in the `@types` registry. Custom declarations may be needed later.
3.  **Directory Structure**:
    *   Created the following directories within `src/` to organize the codebase:
        *   `components`: For React UI components.
        *   `services`: For modules that handle external data or APIs.
        *   `utils`: For utility functions (orbital calculations, geometry).
        *   `types`: For TypeScript type definitions.
        *   `hooks`: For custom React hooks.
        *   `assets`: For static assets.
        *   `constants`: For constant values.
4.  **Initial Type Definitions**:
    *   Created `src/types/orbit.ts` with initial TypeScript interfaces and enums for orbital parameters, satellite data, and simulation results.

## Todo List & Next Steps

-   [ ] **TLE Fetching Service (`src/services/tleService.ts`)**:
    -   [ ] Create a placeholder function for fetching Iridium TLE data.
    -   [ ] Implement actual TLE fetching logic (e.g., from CelesTrak, respecting rate limits). Consider a fallback mechanism or local TLE file for development.
-   [ ] **Orbital Calculation Utilities (`src/utils/orbitCalculation.ts`)**:
    -   [ ] Function to parse TLE strings and initialize `satrec` objects using `satellite.js`.
    -   [ ] Function to propagate satellite orbits over a given time period (e.g., 24 hours) to get time-stamped positions (ECI and Geodetic).
    -   [ ] Functions to convert user-defined Beacon orbit parameters (Altitude + LST for Sun-synchronous, or Altitude + Inclination for Non-polar) into an initial state vector or `satrec`. This is a core challenge and may require research into orbit determination from these parameters or making simplifying assumptions.
-   [ ] **Geometric Calculation Utilities (`src/utils/geometry.ts`)**:
    -   [ ] Define Iridium satellite antenna cone (downward-pointing, 62° FOV).
    -   [ ] Define Beacon satellite antenna cones (two, aligned with the horizon). This will require careful definition of "horizon-aligned" based on the Beacon's position and velocity vector.
    -   [ ] Function to check for intersection between Beacon's antenna cones and Iridium's communication cones.
    -   [ ] Function to determine when the Beacon satellite enters/exits a communication cone (for handshake counting).
-   [ ] **Core Simulation Logic**:
    -   [ ] Develop a simulation loop that advances time in discrete steps over 24 hours.
    -   [ ] At each time step, calculate positions of the Beacon and all relevant Iridium satellites.
    -   [ ] Check for communication cone intersections.
    -   [ ] Track handshakes (each time Beacon enters a *new* Iridium cone).
    -   [ ] Track periods when the Beacon is outside any communication area.
    -   [ ] Calculate total handshakes, number of blackouts, and total/average blackout duration.
-   [ ] **UI Components (`src/components/`)**:
    -   [ ] `OrbitInputForm.tsx`:
        -   [ ] Select orbit type (Sun-synchronous, Non-polar).
        -   [ ] Input fields for corresponding parameters (Altitude, LST/Inclination).
        -   [ ] Validation for input parameters.
    -   [ ] `SimulationControls.tsx`: Buttons to Start, Pause, Reset the simulation.
    -   [ ] `Visualization.tsx`:
        -   [ ] Choose a visualization approach (e.g., 2D map, simplified 3D, or a library like CesiumJS, Deck.gl, react-globe.gl).
        -   [ ] Display orbits of the Beacon and Iridium satellites.
        -   [ ] Visually indicate communication links/cones when active.
        -   [ ] Show areas of no communication.
    -   [ ] `ResultsDisplay.tsx`:
        -   [ ] Clearly present: Total handshakes, number of blackouts, total and average blackout duration.
-   [ ] **State Management**:
    -   [ ] Choose and implement a state management solution (React Context, Zustand, Redux, or prop drilling if simple enough) for managing user inputs, simulation state, and results.
-   [ ] **Constants (`src/constants/`)**:
    -   [ ] Add relevant physical constants (e.g., Earth's radius, gravitational parameter GM).
    -   [ ] Iridium constellation details (e.g., number of planes, satellites per plane, nominal altitude/inclination if needed for general reference, though TLEs will provide specifics).
-   [ ] **Styling and User Experience (UX)**:
    -   [ ] Apply CSS for a clean, intuitive, and aesthetically pleasing interface.
    -   [ ] Ensure the application is responsive and easy to use.
-   [ ] **(Optional) Custom Type Definitions for `satellite.js`**:
    -   [ ] If usage of `satellite.js` becomes cumbersome without types, create a `satellite.d.ts` file in `src/types/` to define the necessary interfaces.
-   [ ] **Testing**:
    -   [ ] Add unit tests for utility functions (orbit calculations, geometry).
    -   [ ] Consider integration tests for component interactions.
-   [ ] **Build and Deployment**:
    -   [ ] Ensure the application can be built for production (`npm run build`).
    -   [ ] Plan for deployment to a web hosting service (e.g., Netlify, Vercel, GitHub Pages).
-   [ ] **Documentation & Presentation**:
    -   [ ] Prepare a video demo.
    -   [ ] Prepare presentation materials explaining innovation, visualization, usability, aesthetics, and accuracy.

## Getting Started with Development

1.  Navigate to the `satmap` directory: `cd satmap`
2.  Install dependencies (if not already done): `npm install`
3.  Start the development server: `npm start`

This should open the app in your default web browser, usually at `http://localhost:3000`.
