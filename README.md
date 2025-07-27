# <img src="https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/icon.png" width="30" height="30" alt="SatMap Icon"> 🛰️ SatMap - V3.0 🚀

**Simulating satellite communication links: Beacon 📡 Iridium in 2D & 3D**

---

## 🌟 Project Overview (V3.0)

SatMap is a **React/TypeScript** web application, now at **Version 3.0**. Originating from the **Space Handshakes Hackathon**, its core purpose is to simulate a satellite equipped with a **Beacon** device orbiting Earth and its communication interactions with the **Iridium constellation**, now visualized in both **interactive 2D and 3D environments**.

The application allows users to define the Beacon satellite's orbit (Sun-Synchronous or Non-Polar LEO) and its parameters (altitude, LST/inclination). SatMap dynamically generates a valid Two-Line Element set (TLE) for the Beacon, enabling realistic custom orbit simulations, typically over a 24-hour period. Key outputs include handshake counts, communication blackout analysis, percentage of time in communication, and detailed event logging.

Version 3.0 introduces a major leap in visualization by adding a **3D mode using Three.js**, allowing users to view satellite orbits, communication cones, and the Earth in a more immersive way. This builds upon the robust 2D simulation and UI/UX enhancements of V2.0. The naming convention remains: `SatMap` (project), `SatSimUI` (UI), and `SatCore` (engine).

**Hackathon Context:** The project addresses the "Space Handshakes" challenge, focusing on innovation, visualization, usability, aesthetics, and accuracy, supporting IRIDIUM and IRIDIUM-NEXT TLE datasets.

---

## 📖 Detailed Technical Documentation

For a comprehensive understanding of SatMap's architecture, algorithms, orbital mechanics, dynamic TLE generation, simulation logic, and detailed breakdowns of features across V1.0, V2.0, and V3.0, please consult our technical documentation:

➡️ **[View Detailed Technical Docs (DOCS.md)](./DOCS.md)**

---

## 🛠️ Technology Stack (V3.0)

*   **Core Logic (`SatCore`):** TypeScript, `satellite.js` (orbital mechanics).
*   **Frontend (`SatSimUI`):** React, TypeScript.
*   **2D Data Visualization:** `react-simple-maps`.
*   **3D Data Visualization:** `three.js`, `@react-three/fiber`, `@react-three/drei`.
*   **HTTP Requests:** `axios` (Iridium TLEs from CelesTrak).
*   **Build Tool:** Create React App.
*   **Styling:** CSS (global styles, component-specific CSS Modules), Dark Theme.

---
## 🧠 Core Logic Flow (V3.0)

The simulation process in SatMap V3.0 involves:

1.  **User Input (`OrbitInputForm.tsx`):** Configuration of Beacon orbit, handshake mode, FOVs, simulation timing, and Iridium datasets.
2.  **Beacon TLE Generation (`orbitCalculation.ts`):** Dynamic TLE creation.
3.  **Iridium TLE Fetching (`tleService.ts`):** Retrieval of constellation data.
4.  **Satellite Initialization:** Parsing TLEs into `SatRec` objects.
5.  **Time-Stepped Propagation:** Calculation of ECI and Geodetic coordinates.
6.  **Communication Link Detection (`simulationEngine.ts`, `geometry.ts`):** Applying one-way or bi-directional logic with Line of Sight checks.
7.  **Handshake & Blackout Logging:** Recording communication events.
8.  **Results Aggregation & Visualization:** Displaying metrics (including total handshakes, blackout statistics, and percentage of time in communication) and visualizing data on switchable **2D (`SatVisualization.tsx`) and 3D (`SatVisualization3D.tsx`) maps**. Both views support playback controls (speed, timelapse, realtime) and a time-range selector for focused data display (trails, markers). Interactive panels provide detailed information.

---
## 🖼️ Sneak Peek (Illustrative of V1-V3 Features)

(Image links remain as they are, assuming they showcase relevant UI aspects, potentially add a 3D view screenshot if available)
**Main Application View & Input Form:**
![Main Page Layout](https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/MainPage.png)

**Configuring Simulation Parameters:**
![Parameter Settings](https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/ParametersSettings.png)

**Simulation Map Visualization:**
![Basic Map View](https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/Map.png)

**Map with Trails and Satellite Names:**
![Map with Trails and Names](https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/MapWithTrailandNames.png)

**Simulation Results Summary:**
![Simulation Results Display](https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/SimResults.png)

**Detailed Satellite Information (Side Panel):**
![Side Menu with Satellite Details](https://raw.githubusercontent.com/AryanRai/SatMap/main/satmap/public/SideMenu.png)

**3D:**
![Side Menu with Satellite Details](<img width="977" height="784" alt="Screenshot 2025-05-21 043959" src="https://github.com/user-attachments/assets/4d056b9f-4ed1-4579-b88a-aac1ca0bd20a" />
)

****
![Side Menu with Satellite Details](<img width="977" height="784" alt="Screenshot 2025-05-21 043959" src="https://github.com/user-attachments/assets/4d056b9f-4ed1-4579-b88a-aac1ca0bd20a" />
)

**Full Page:**
<img width="1919" height="883" alt="Screenshot 2025-05-21 202521" src="https://github.com/user-attachments/assets/5b6bd94a-f729-40af-8901-96dae98200f9" />

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

## ✅ V2.0 Development Status & Key Features

**Version 2.0 significantly enhanced the user experience and feature set, focusing on a polished 2D simulation environment.**

*(This section should accurately reflect the V2.0 features as implemented before V3.0, serving as a historical record. It emphasizes the UI/UX overhaul, advanced 2D controls, refined simulation configuration, and core logic enhancements like Line of Sight and the updated bi-directional handshake definition. It's important to note that V2.0 was pre-3D.)*

Key Achievements in V2.0 included:
*   **Enhanced UI & UX:** Modernized aesthetics, introduction of interactive panels (Current Connections, Satellite Details, Console/Log).
*   **Advanced 2D Simulation Controls:** Playback speed control, timelapse feature, realtime mode simulation, and a time-range selector for 2D map features (trails, markers).
*   **Refined Simulation Configuration:** Selection of Iridium datasets (active, next, all), bi-directional handshake as default, user-defined simulation start time.
*   **Core Logic Enhancements:** Implementation of Earth occultation (Line of Sight) check, and an updated bi-directional handshake logic (mutual horizon scanning).

---

## ✅ V3.0 Development Status & Key Features - Embracing the Third Dimension

**Version 3.0 marks a major milestone by introducing a fully interactive 3D visualization mode, alongside specialized viewport features, bringing a new level of immersion and analytical capability to SatMap.**

**Key Achievements in V3.0:**

*   **Core 3D Visualization (`SatVisualization3D.tsx`):**
    *   **Switchable 3D Map Mode:** Users can toggle between the established 2D map and a new 3D Earth globe view.
    *   **3D Object Rendering:** Satellites (as distinct markers) and their orbital paths (trails) are rendered as 3D objects in space.
    *   **Communication Cone Visualization (3D):** Beacon's horizon-aligned and Iridium's nadir-pointing communication cones are visually rendered in the 3D scene. This feature is toggleable, with FOV cones shown by default.
    *   **Earth Footprints (3D):** Iridium nadir cone footprints are projected onto the 3D Earth's surface as circles.
    *   **Default 3D View:** A blank Earth globe is displayed by default before a simulation is run.
    *   **Texture Alignment:** Visual consistency is maintained between 2D and 3D map Earth textures.
*   **Feature Parity and Enhancements in 3D View:**
    *   **Full Playback Suite:** All 2D playback controls (play/pause, reset, speed selection, timelapse mode, realtime mode) are fully functional in the 3D view.
    *   **Time Range Selector for 3D:** The dual-slider time range selector filters the display of both satellite trails and handshake markers in the 3D environment.
    *   **3D Satellite Trails:** Trails for both Beacon and Iridium satellites are toggleable and are off by default in the 3D view.
    *   **3D Active Link Lines:** Visual representation of active communication links (lines) between the Beacon and Iridium satellites in the 3D space.
    *   **3D Handshake Markers:** Handshake events are visualized as distinct markers (e.g., small spheres) at the location of the Beacon at the time of handshake initiation, filtered by the time range selector.
    *   **Enlarged 3D Satellite Labels:** Default font size for satellite labels (names) has been increased for better readability in the 3D scene.
*   **Specialized Viewports (Conceptualized/Partially Implemented based on User Request History):**
    *   *(Note: The user history mentions 'Beacon FOV Viewport' and 'Iridium FOV Viewport' as planned or discussed. If these are not fully implemented UI elements, this section should reflect their status accurately, e.g., "Conceptualized for future implementation" or describe any existing related camera controls if applicable.)*
    *   Enhanced camera controls allowing users to focus on individual satellites (Beacon or Iridium) to better observe their FOV and interactions.
*   **Configuration & Defaults for V3.0:**
    *   **User-Defined Simulation Start Time:** Robust functionality for users to manually set a specific date and time (UTC) for the simulation to begin.
    *   **Bi-Directional Handshake Default:** Maintained as the default operational mode for communication checks.
    *   **Default Trail/Cone Visibility:** Trails are OFF by default in 3D, FOV cones are ON by default in 3D.
    *   **Consistent UI Styling:** Ensured consistent styling for key UI elements like the `#simulationStartTime` input across the application.
    *   **Default Beacon Altitude:** Lowered default Beacon altitude in the input form (e.g., to 550km).

---

## 🚀 V3.x Future Enhancements & Long-Term Aspirations

With the core 3D functionality and essential viewport controls established in V3.0, future development (V3.x and beyond) will focus on further polishing the user experience, adding more advanced simulation features, and improving performance.

*   **Immediate Next Steps (V3.x):**
    *   **UI/UX Refinements:** Introduce subtle **Glassmorphic UI elements** for a more modern aesthetic, ensuring theme consistency.
    *   **Introduction/How-To-Use Guide:** Integrate an in-app tutorial, "Getting Started" prompts, or a modal explaining key features for new users.
    *   **Performance & Technical Improvements:** Implement a **TLE Cache Toggle** in the UI to allow users to use cached Iridium TLE data, reducing API calls to CelesTrak and speeding up simulation setup for repeated runs with the same dataset.
*   **Long-Term Goals (Post-V3.x / Future Vision):**
    *   **Public API Development:** Design and expose a public API to allow external tools or scripts to trigger simulations and retrieve results.
    *   **Advanced 3D Models:** Introduce support for importing and displaying custom 3D satellite models (e.g., via FBX, GLTF formats) instead of generic markers.
    *   **Full-Screen Mode:** Implement a full-screen viewing option for both 2D and 3D visualizations.
    *   **Orbit Insertion/Maneuver Simulation:** Basic simulation capabilities for satellite deployment phases or simple orbital maneuvers.
    *   **Advanced Simulation Logic:**
        *   More detailed antenna pattern modeling beyond simple cones.
        *   Basic atmospheric interference modeling.
        *   Doppler shift calculations.
    *   **Data Export Options:** Allow users to export simulation results (e.g., handshake logs, blackout data) in formats like CSV or JSON.
    *   **User Accounts & Saved Configurations:** Allow users to save and load preferred simulation setups.
    *   **Enhanced Earth Visuals:** Higher resolution textures, dynamic clouds, city lights on the night side for the 3D globe.

---

**IMPORTANT PROJECT STRUCTURE NOTE:** All source code (`*.ts`, `*.tsx`) should reside within the `satmap/src/` directory. This `README.md` and `DOCS.md` are in the `satmap/` project root.
