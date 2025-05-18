# SatMap V3.0: Video Script & Technical Presentation Guide

## I. Video Script Outline (2-5 Minutes)

**Objective:** Quickly showcase SatMap V3.0's core functionality, visual appeal, and touch on its technical foundation.

---

### 1. Introduction (15-30 seconds)

*   **Visual:** Start with an engaging shot of the 3D globe with orbits, or a quick montage of 2D/3D views.
*   **Voiceover/Presenter:**
    *   "Ever wondered how satellites navigate the complexities of communication in orbit? Or how we can visualize these vital links?"
    *   "This is SatMap, now at Version 3.0 – a web application designed to simulate and visualize communication handshakes between a custom Beacon satellite and the entire Iridium constellation."
    *   "Born out of the Space Handshakes Hackathon, SatMap helps us understand satellite interactions in both interactive 2D and immersive 3D environments."

---

### 2. App Showcase - Key Features (1.5 - 3 minutes)

*   **A. Input & Configuration (`OrbitInputForm.tsx`)**
    *   **Visual:** Screen recording of the input form. Zoom into relevant sections as they are mentioned.
    *   **Voiceover/Presenter:**
        *   "Users begin by defining their Beacon satellite's orbit – choosing between Sun-Synchronous or a Non-Polar LEO, and setting parameters like altitude and LSTN or inclination."
        *   (Show these inputs being changed)
        *   "Next, configure the simulation timing – start date/time, duration, and the precision of each time step."
        *   (Show these inputs)
        *   "Crucially, set the communication parameters: select one-way or bi-directional handshake mode, and define the Field of View for both the Beacon and Iridium satellites. You can also select which Iridium datasets to use."
        *   (Show these inputs)
        *   "With the configuration set, let's run the simulation!"
        *   (Click "Run Simulation", show the loading animation briefly).

*   **B. 2D Visualization (`SatVisualization.tsx`)**
    *   **Visual:** Switch to the 2D map view. Show satellites moving.
    *   **Voiceover/Presenter:**
        *   "Once the simulation completes, SatMap presents the results, starting with our 2D map. Here, we see the ground tracks of our Beacon and the Iridium satellites."
        *   "Interactive playback controls allow us to play, pause, adjust speed, activate a timelapse, or even run in a simulated realtime mode."
        *   (Demonstrate play/pause, change speed, click timelapse).
        *   "A key feature is the time range selector, allowing us to focus on specific periods within the simulation, filtering both trails and communication events."
        *   (Demonstrate the dual sliders).
        *   "Users can toggle satellite trails, labels, active communication link lines, and handshake markers for a clearer view."
        *   (Quickly toggle some of these features).

*   **C. 3D Visualization (`SatVisualization3D.tsx`)**
    *   **Visual:** Switch to the 3D view. Rotate the globe.
    *   **Voiceover/Presenter:**
        *   "Version 3.0 brings a new dimension with our interactive 3D globe!"
        *   "Here, orbits come to life in three-dimensional space. We can visually inspect communication cones – both the Beacon's horizon-scanning cones and the Iridium satellites' nadir-pointing cones, including their projected footprints on Earth."
        *   (Toggle cones and footprints, zoom/rotate to show them clearly).
        *   "All playback controls, including the time range selector, work seamlessly in 3D, offering consistent analysis capabilities."
        *   (Demonstrate playback slider in 3D, show markers filtering).
        *   "Active communication links and handshake events are also visualized in this immersive 3D environment."

*   **D. Data & Analysis (`SimulationResultsDisplay.tsx` & `SidePanel.tsx`)**
    *   **Visual:** Show the `SimulationResultsDisplay` component, then click a satellite to open the `SidePanel`.
    *   **Voiceover/Presenter:**
        *   "Beyond visuals, SatMap provides key metrics: Total Handshakes, the Percentage of Time the Beacon is in Communication, and detailed Blackout statistics are clearly displayed."
        *   (Point to these on `SimulationResultsDisplay`).
        *   "For deeper insights, clicking any satellite or an active connection in the `CurrentConnectionsPanel` opens the detailed `SidePanel`. Here you can find specific satellite data, a log of all handshakes, and the current active link status."
        *   (Show `SidePanel` content briefly).

---

### 3. Tech Stack & Code Overview (15-45 seconds)

*   **Visual:** Briefly show a slide with tech logos, then a quick screen recording of the VS Code file tree.
*   **Voiceover/Presenter:**
    *   "SatMap is built with a modern tech stack: React and TypeScript for the frontend, `satellite.js` for the heavy lifting of orbital mechanics, and `Three.js` with `@react-three/fiber` powering our 3D visualizations."
    *   "Our code is structured logically: UI components reside in `src/components`, the core simulation logic is in `simulationEngine.ts`, orbital calculations and geometry utilities are in `src/utils`, and data types are defined in `src/types`."
    *   (Briefly highlight these folders in the file tree).

---

### 4. Conclusion (15-30 seconds)

*   **Visual:** End with a dynamic shot of the 3D view or the project's GitHub page.
*   **Voiceover/Presenter:**
    *   "SatMap V3.0 offers a robust platform for simulating, visualizing, and analyzing satellite communication scenarios."
    *   "Explore complex orbits, understand communication windows, and dive into the data. Check out the project on GitHub to see the code or even contribute!"
    *   (Show footer link with GitHub URL clearly visible).
    *   "Thanks for watching!"

---
---

## II. Technical Presentation Talking Points (For a 5-Person Team)

**Objective:** Provide a comprehensive technical overview of the project, allowing each team member to discuss their contributions and areas of expertise.

---

### Speaker 1: Project Lead & Introduction (5-7 minutes)

*   **A. Project Genesis & Goals:**
    *   Introduction to the "Space Handshakes Hackathon" challenge: core problem statement.
    *   Initial Vision: Create a tool to simulate and visualize communication opportunities between a user-defined satellite (Beacon) and the Iridium constellation.
    *   Evolution of SatMap:
        *   **V1.0 (MVP):** Basic TLE generation, 2D map, simple handshake logic.
        *   **V2.0 (Enhanced 2D & UX):** Major UI/UX overhaul, advanced 2D controls (playback, time range), refined simulation config, robust LoS and bi-directional handshake logic.
        *   **V3.0 (3D Visualization):** Introduction of interactive 3D globe, 3D object rendering (satellites, orbits, cones, footprints, links), feature parity with 2D controls.
*   **B. High-Level Application Demonstration:**
    *   Live walkthrough of the SatMap V3.0 UI.
        *   **Input (`OrbitInputForm.tsx`):** Briefly demonstrate setting up a custom orbit (SSO & Non-Polar), simulation timing, FOVs, and handshake mode.
        *   **Execution:** Initiate simulation, highlight loading state.
        *   **2D View (`SatVisualization.tsx`):** Showcase ground tracks, playback controls, time-range filtering, toggles for trails/links/markers.
        *   **3D View (`SatVisualization3D.tsx`):** Switch to 3D, demonstrate camera controls, 3D orbits, visualization of communication cones and Earth footprints, active links.
        *   **Results (`SimulationResultsDisplay.tsx`, `SidePanel.tsx`, `CurrentConnectionsPanel.tsx`):** Show key metrics, how to access detailed satellite info and handshake logs.
*   **C. User Benefits & Potential Use Cases:**
    *   **Educational Tool:** Understanding orbital mechanics, satellite communication concepts (FOV, LoS, handshakes), and constellation interactions.
    *   **Rapid Prototyping:** Quickly assessing communication feasibility for different Beacon orbital parameters and antenna configurations.
    *   **Visual Analysis:** Identifying patterns in communication windows, blackout periods, and geographic coverage.
    *   Foundation for more complex simulations.
*   **D. Team Introduction & Role Overview (Briefly introduce other speakers and their focus areas).**

---

### Speaker 2: Frontend Architecture & UI/UX (7-10 minutes)

*   **A. Technology Stack - Frontend Focus:**
    *   **React:** Component-based architecture, reusable UI elements, efficient rendering.
    *   **TypeScript:** Enhanced code quality, type safety, better maintainability, easier refactoring.
    *   **Key Libraries:**
        *   `react-simple-maps`: For 2D map rendering and geographic projections.
        *   `@react-three/fiber` & `@react-three/drei`: Declarative Three.js for 3D scene graph, helpers for common 3D tasks (camera controls, geometries).
    *   **Styling:** Global CSS (`App.css`) and CSS Modules for component-specific styles, dark theme implementation.
*   **B. Component Breakdown & Responsibilities:**
    *   **`App.tsx`:**
        *   Main application container, orchestrates state and data flow.
        *   Manages global UI states (loading, error, panel visibility, visualization mode, playback states, `selectedTimeRange`).
        *   Handles simulation submission and results processing.
    *   **Input Components (`OrbitInputForm.tsx`):**
        *   Controlled components for capturing user-defined simulation parameters.
        *   Form validation (basic, e.g., for start time format).
        *   Construction of the `SimulationConfig` object.
    *   **Visualization Components:**
        *   **`SatVisualization.tsx` (2D):**
            *   Integration with `react-simple-maps`.
            *   Logic for drawing ground tracks, satellite markers, active links, handshake markers.
            *   Handling map interactions (pan, zoom - if applicable).
            *   Filtering displayed elements based on `currentTimeIndex` and `selectedTimeRange`.
        *   **`SatVisualization3D.tsx` (3D):**
            *   `@react-three/fiber` scene setup (`<Canvas>`).
            *   Camera (`PerspectiveCamera`), lighting (`ambientLight`, `directionalLight`).
            *   Rendering 3D objects: Earth (textured sphere), satellites (e.g., `<Sphere>`), orbits (e.g., `<Line>`), communication cones (`<Cone>`), Earth footprints (`<Circle>`).
            *   Transformation of satellite coordinates (Geodetic/ECI) to 3D scene positions.
            *   Implementation of toggleable features (trails, cones, labels).
    *   **Data Display & Control Components:**
        *   `PlaybackControls.tsx`: UI for play/pause, speed, timelapse, realtime, time slider, time range selector. Manages playback logic interaction with `App.tsx`.
        *   `SimulationResultsDisplay.tsx`: Presents key metrics derived from `SimulationResults` and `SimulationConfig`.
        *   `SidePanel.tsx`, `CurrentConnectionsPanel.tsx`: Displaying detailed/dynamic data, interactivity, draggable/minimizable panel features.
*   **C. State Management Strategy:**
    *   Primarily `useState` and `useEffect` hooks within `App.tsx` for managing global application state.
    *   Prop drilling for passing state and handlers to child components.
    *   Discussion: Rationale for this approach (e.g., sufficient for current complexity) vs. alternatives like Context API or Redux (potential future consideration for larger scale).
*   **D. UI/UX Evolution & Design Philosophy:**
    *   Iterative improvements from V1 to V3 focusing on usability and clarity.
    *   Implementation of dark theme for visual comfort and aesthetic.
    *   Responsive design considerations (e.g., `dashboard-layout` media queries in `App.css`) for different screen sizes.
    *   User feedback incorporation (if any specific examples).

---

### Speaker 3: Simulation Engine & Orbital Mechanics (7-10 minutes)

*   **A. Core Logic - `simulationEngine.ts` (`runSimulation` function):**
    *   **Input:** `SimulationConfig` object (detailing Beacon parameters, FOVs, simulation duration, time step, handshake mode, Iridium dataset choice).
    *   **Core Process Flow:**
        1.  **Initialization:**
            *   Dynamic generation of Beacon TLE based on `config.beaconParams`.
            *   Fetching Iridium TLEs using `tleService.ts` (handles API calls to CelesTrak, choice of datasets).
            *   Parsing TLEs into `SatRec` objects using `satellite.js`.
        2.  **Time-Stepped Propagation Loop:**
            *   Iterates from `startTime` to `endTime` with `timeStepMs`.
            *   At each step, propagates Beacon and all Iridium `SatRec`s to get ECI positions/velocities.
            *   Converts ECI to Geodetic coordinates for logging and potential use.
            *   Performs communication checks (delegated to Speaker 4).
            *   Logs satellite tracks (`beaconTrack`, `iridiumTracks`), active links (`activeLinksLog`), handshakes (`handshakeLog`), and blackout periods (`blackoutPeriods`).
    *   **Output:** `SimulationResults` object containing all processed data.
*   **B. `satellite.js` - The Orbital Mechanics Powerhouse:**
    *   Role: Provides SGP4/SDP4 algorithms for predicting satellite positions from TLEs.
    *   Key Functions Used:
        *   `twoline2satrec(tleLine1, tleLine2)`: Parses TLE strings into a `SatRec` (satellite record) object.
        *   `propagate(satrec, date)`: Computes satellite position (ECI) and velocity (ECI) at a given `Date`.
        *   `eciToGeodetic(eciVec, gmst)`: Converts ECI coordinates to geodetic (latitude, longitude, altitude) using GMST (Greenwich Mean Sidereal Time).
        *   `gstime(date)`: Calculates GMST for coordinate transformations.
    *   Custom Type Definitions (`satellite.d.ts`): Necessity due to lack of official types, improving TypeScript integration.
*   **C. Dynamic Beacon TLE Generation (`src/utils/orbitCalculation.ts`):**
    *   **Purpose:** Allow users to define custom Beacon orbits not available in public TLE catalogs.
    *   **Inputs:** Orbit type (SSO/Non-Polar), altitude, LSTN (for SSO) or Inclination/RAAN (for Non-Polar), simulation start time (for epoch).
    *   **Key Calculations:**
        *   Epoch details from simulation start time.
        *   Mean Motion (`n`): From semi-major axis (altitude + Earth radius) using Kepler's Third Law.
        *   Inclination (`i`): User input for Non-Polar; calculated for SSO to achieve desired nodal precession rate (formula involving J2, Earth radius, semi-major axis, eccentricity).
        *   RAAN (`Ω`): User input for Non-Polar (optional); calculated for SSO based on LST_DN and Sun's RA.
        *   Eccentricity (`e`): Assumed near-circular (e.g., 0.0001).
        *   Argument of Perigee (`ω`), Mean Anomaly (`M`): Typically set to 0 for new, circularish orbits.
        *   Checksum calculation for TLE lines.
*   **D. Performance Considerations & Optimizations (Simulation Core):**
    *   Impact of `simulationTimeStepSec`: Smaller steps = higher accuracy but longer computation.
    *   Number of Iridium satellites: Affects loop iterations per time step.
    *   Data structures for tracks and logs: Efficiently appending data.
    *   `async/await` for TLE fetching to prevent UI blocking.

---

### Speaker 4: Communication Logic & Geometry (7-10 minutes)

*   **A. Defining a "Handshake":**
    *   Concept: A continuous communication session initiated with a *new* Iridium satellite.
    *   Implementation: Tracking `previousConnectedIridiumSatIds` and `currentConnectedIridiumSatIdsThisStep`. A new handshake is logged when a satellite appears in `current` but was not in `previous`.
*   **B. Communication Cone Geometry (`src/utils/geometry.ts`):**
    *   **`GeometricCone` Interface:** Defines a cone by its tip (origin), axis vector (direction), and aperture (half-angle).
    *   **`createIridiumCone` function:**
        *   Creates a nadir-pointing cone for Iridium satellites.
        *   Tip: Iridium's ECI position.
        *   Axis: Vector from Iridium towards Earth's center (negative of Iridium's position vector, normalized).
        *   Aperture: User-defined Iridium FOV / 2.
    *   **`createHorizonAlignedAntennaCones` function:**
        *   Used for Beacon's bi-directional mode and Iridium's bi-directional mode.
        *   Models antennas scanning the horizon (perpendicular to the satellite's velocity vector and nadir vector).
        *   Tip: Satellite's ECI position.
        *   Axis: Typically calculated using cross products involving velocity and position vectors to point along the horizon. The implementation details might involve creating multiple cones or a toroidal-like check if simplified. (Clarify specific implementation for axis determination for these cones).
        *   Aperture: User-defined FOV / 2 for the respective satellite.
*   **C. Communication Check Logic (within `simulationEngine.ts` loop):**
    *   **1. Point-in-Cone Test (`isPointInCone` in `geometry.ts`):**
        *   Inputs: Target point (ECI), `GeometricCone`.
        *   Method: Calculates the angle between the vector from cone tip to the target point and the cone's axis. If this angle is less than or equal to the cone's half-angle, the point is inside. (Vector dot product method).
    *   **2. Handshake Mode Application:**
        *   **One-Way:** Check if Beacon ECI is in Iridium's nadir cone.
        *   **Bi-Directional:** Check if Beacon ECI is in Iridium's horizon-aligned cone(s) AND Iridium ECI is in Beacon's horizon-aligned cone(s).
    *   **3. Line of Sight (LoS) Check (`isLineOfSightClear` in `geometry.ts`):**
        *   **Purpose:** Ensure no Earth occultation. Applied *after* cone checks confirm potential visibility.
        *   **Inputs:** ECI positions of Beacon and Iridium. Earth's radius from `physicalConstants.ts`.
        *   **Method:** Calculates the closest approach of the line segment (connecting Beacon and Iridium) to Earth's center. If this distance is greater than Earth's radius, LoS is clear. (Involves vector projection and magnitude calculations).
*   **D. FOV Configuration & Conversion:**
    *   User inputs FOV in degrees.
    *   Converted to radians and then half-angles for use in geometric calculations.
*   **E. Data Structures for Geometric Calculations (`Point` interface in `geometry.ts`):**
    *   Simple `{x, y, z}` Cartesian vector representation used internally by geometry functions.
    *   Conversion from `satellite.js` ECI vectors.

---

### Speaker 5: Data Management, 3D Visualization Nuances, & Future Roadmap (7-10 minutes)

*   **A. Data Flow: From Simulation to Visualization:**
    *   `runSimulation` produces `SimulationResults`.
    *   `App.tsx` stores `simulationResults` and `currentConfigForDisplay` in state.
    *   Props are passed to child components:
        *   `SimulationResultsDisplay` receives `results` and `simulationConfig` to show summary stats (including comms percentage).
        *   `SatVisualization` (2D) & `SatVisualization3D` (3D) receive `results`, `currentTimeIndex`, `selectedTimeRange`, FOV configs, UI toggles.
    *   Visualization components filter and render data dynamically based on `currentTimeIndex` (for playback animation) and `selectedTimeRange` (for focused data display).
        *   Slicing `beaconTrack` and `iridiumTracks` for trails.
        *   Filtering `handshakeLog` for markers.
        *   Using `activeLinksLog` to draw current communication lines.
*   **B. 3D Visualization - Technical Details & Challenges (`SatVisualization3D.tsx`):**
    *   **Coordinate System Mapping:**
        *   Orbital data (ECI/Geodetic) needs to be transformed into the Three.js 3D world coordinate system. Typically, ECI positions (km) are scaled and mapped. Earth is centered at (0,0,0).
    *   **Object Representation & Geometry:**
        *   Earth: `SphereGeometry` with texture.
        *   Satellites: `SphereGeometry` (for markers), potentially `Sprite` for labels.
        *   Orbital Trails: `BufferGeometry` with `LineBasicMaterial` or `LineMaterial` (from `three/examples/jsm/lines`), updated dynamically.
        *   Communication Cones: `ConeGeometry`, oriented using satellite position and axis vectors. Correct translation and rotation are key (e.g., `lookAt` or quaternion rotations). Using `translateY(-coneHeight / 2)` to place tip at satellite.
        *   Earth Footprints: `CircleGeometry` projected onto the Earth's surface (can be complex; might involve raycasting or mathematical projection onto sphere).
    *   **Lighting & Materials:** Importance of `ambientLight` and `directionalLight` for visibility. `MeshStandardMaterial` for realistic lighting on Earth/cones vs. `MeshBasicMaterial` for unlit elements if any.
    *   **Camera & Controls:** `PerspectiveCamera`, `OrbitControls` for user interaction.
    *   **Performance in 3D:**
        *   Minimizing draw calls.
        *   Efficiently updating object positions and trail geometries.
        *   Careful management of `useEffect` dependencies to avoid unnecessary re-renders of the 3D scene.
    *   **Ensuring Visual Accuracy:** Aligning cone directions, trail paths, and footprints with simulation data. Debugging visual discrepancies (e.g., initial cone direction issues).
*   **C. Key Metrics Calculation & Display:**
    *   `totalHandshakes`: Direct from simulation.
    *   `percentageInCommunication`: Calculated in `SimulationResultsDisplay.tsx` using `totalBlackoutDuration` from `results` and `simulationDurationHours` from `simulationConfig`.
        *   `Total Sim Duration (s) = durationHours * 3600`
        *   `Comms Duration (s) = Total Sim Duration - totalBlackoutDuration`
        *   `Percentage = (Comms Duration / Total Sim Duration) * 100`
    *   `numberOfBlackouts`, `totalBlackoutDuration`, `averageBlackoutDuration`: Direct from simulation.
*   **D. Future Enhancements & Long-Term Aspirations (Briefly recap from README/DOCS):**
    *   **V3.x (Immediate Next Steps):** Glassmorphic UI elements, In-app Tutorial/Guide, TLE Cache Toggle.
    *   **Long-Term Vision:** Public API, Advanced 3D models (FBX/GLTF), Full-Screen Mode, Basic Orbit Insertion/Maneuver Simulation, Enhanced Simulation Logic (antenna patterns, atmospheric effects, Doppler), Data Export, User Accounts, Higher-Res Earth visuals, WebAssembly for performance.
*   **E. Technical Challenges Faced & Lessons Learned (Optional, if time permits):**
    *   E.g., 3D cone orientation, performance tuning, state management complexity.
*   **F. Q&A Session Facilitation.**

--- 