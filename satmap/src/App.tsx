import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import OrbitInputForm from './components/OrbitInputForm';
import { SimulationConfig, SimulationResults } from './types/orbit';
import { runSimulation } from './simulationEngine';
import SatVisualization from './components/SatVisualization';
import SimulationConfigDisplay from './components/SimulationConfigDisplay';
import SimulationResultsDisplay from './components/SimulationResultsDisplay';
import CurrentConnectionsPanel from './components/CurrentConnectionsPanel';
import panelStyles from './components/CurrentConnectionsPanel.module.css';
import SidePanel from './components/SidePanel';

/**
 * Main application component for SatMap.
 * Manages the overall application state including simulation configuration,
 * results, loading status, and errors. It renders the input form,
 * simulation results, and visualization components.
 */
function App() {
  // State for storing the results of the latest simulation.
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  // State to indicate whether a simulation is currently in progress.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State for storing any error messages that occur during simulation.
  const [error, setError] = useState<string | null>(null);
  // State to store the configuration of the currently displayed simulation results
  const [currentConfigForDisplay, setCurrentConfigForDisplay] = useState<SimulationConfig | null>(null);

  // State for the new connections panel
  const [isConnectionsPanelToggledOpen, setIsConnectionsPanelToggledOpen] = useState<boolean>(false);
  const [isPanelHoverActivated, setIsPanelHoverActivated] = useState<boolean>(false);
  const panelHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for managing hover-out delay

  // Centralized currentTimeIndex state
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number>(0);

  // Lifted state for selected satellite ID
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  // State for SidePanel's initial position
  const [sidePanelInitialPosition, setSidePanelInitialPosition] = useState<{ x: number, y: number } | null>(null);

  /**
   * Handles the submission of the orbit parameters form.
   * It triggers the simulation engine with the provided configuration.
   * Updates loading, results, error, and displayed config states accordingly.
   * @param config The SimulationConfig object from the OrbitInputForm.
   */
  const handleFormSubmit = async (config: SimulationConfig) => {
    setIsLoading(true);
    setSimulationResults(null);
    setError(null);
    setCurrentConfigForDisplay(null);
    setCurrentTimeIndex(0); // Reset time index on new simulation
    setSelectedSatelliteId(null); // Clear selected satellite on new simulation
    setSidePanelInitialPosition(null); // Clear panel position on new simulation

    try {
      const results = await runSimulation(config);
      setSimulationResults(results);
      setCurrentConfigForDisplay(config);
    } catch (e: any) {
      console.error('Simulation failed in App:', e);
      setError(e.message || 'An unexpected error occurred during simulation.');
    }
    setIsLoading(false);
  };

  const toggleConnectionsPanel = () => {
    setIsConnectionsPanelToggledOpen(prev => !prev);
    if (!isConnectionsPanelToggledOpen) {
      setIsPanelHoverActivated(false); // If opening via toggle, ensure hover doesn't conflict close
    }
  };

  const handleLeftHoverZoneEnter = () => {
    if (panelHoverTimeoutRef.current) clearTimeout(panelHoverTimeoutRef.current);
    if (!isConnectionsPanelToggledOpen) { // Only activate by hover if not already toggled open
      setIsPanelHoverActivated(true);
    }
  };

  const handleLeftHoverZoneLeave = () => {
    // Delay hiding to allow mouse to move into the panel
    panelHoverTimeoutRef.current = setTimeout(() => {
      if (!isConnectionsPanelToggledOpen) { // Only hide if opened by hover
         //setIsPanelHoverActivated(false); // This will be handled by panelMouseLeave for robustness
      }
    }, 200); // Adjust delay as needed
  };
  
  const handlePanelMouseEnter = () => {
    if (panelHoverTimeoutRef.current) clearTimeout(panelHoverTimeoutRef.current);
    // Keep hover-activated if mouse enters panel
    if (!isConnectionsPanelToggledOpen && !isPanelHoverActivated) {
        setIsPanelHoverActivated(true);
    }
  };

  const handlePanelMouseLeave = () => {
     if (!isConnectionsPanelToggledOpen) { // Only auto-close if it was opened by hover
        setIsPanelHoverActivated(false);
    }
  };

  const closeConnectionsPanel = () => {
    setIsConnectionsPanelToggledOpen(false);
    setIsPanelHoverActivated(false);
  };
  
  const panelVisible = isConnectionsPanelToggledOpen || isPanelHoverActivated;

  let panelButtonText = "Show Active Comms";
  if (isConnectionsPanelToggledOpen) {
    panelButtonText = "Hide Active Comms";
  } else if (isPanelHoverActivated) {
    panelButtonText = "Panel Active (Hover)"; // Or something similar
  }

  // Handler to close the side panel (previously in SatVisualization)
  const handleCloseSidePanel = () => {
    setSelectedSatelliteId(null);
    setSidePanelInitialPosition(null); // Also clear position when closing
  };

  // New handler for selecting a satellite, potentially with click coordinates
  const handleSatelliteSelect = (id: string, clickCoords?: { x: number; y: number }) => {
    setSelectedSatelliteId(id);
    if (clickCoords) {
      setSidePanelInitialPosition(clickCoords);
    } else {
      // If selected from a non-map source (e.g., CurrentConnectionsPanel),
      // set to null so SidePanel uses its default or stays put if already open.
      // SidePanel's own useEffect for selectedSatelliteId will handle new default if it was closed.
      setSidePanelInitialPosition(null); 
    }
  };

  return (
    <div className="App">
      {/* Left Edge Hover Activation Zone */}
      <div 
        className="left-hover-zone"
        onMouseEnter={handleLeftHoverZoneEnter}
        onMouseLeave={handleLeftHoverZoneLeave}
      />

      <CurrentConnectionsPanel 
        results={simulationResults}
        currentTimeIndex={currentTimeIndex}
        isOpen={panelVisible}
        onClose={closeConnectionsPanel}
        onMouseEnterPanel={handlePanelMouseEnter}
        onMouseLeavePanel={handlePanelMouseLeave}
        setSelectedSatelliteId={(id: string | null) => {
          if (id) {
            handleSatelliteSelect(id); // clickCoords will be undefined, panel will use default pos or stay
          } else {
            // If CurrentConnectionsPanel wants to clear selection, mirror behavior of closing SidePanel
            handleCloseSidePanel(); 
          }
        }}
      />

      <header className="App-header">
        <button onClick={toggleConnectionsPanel} className="panel-toggle-button">
          {panelButtonText}
        </button>
        <h1>🛰️ SatMap: Satellite Handshake Simulator V2</h1>
      </header>
      
      <div className={`dashboard-layout ${panelVisible ? 'panel-open' : ''}`}>
        {simulationResults && (
          <div className="dashboard-column results-column">
            <SimulationResultsDisplay results={simulationResults} />
          </div>
        )}
        {currentConfigForDisplay && (
          <div className="dashboard-column config-column">
            <SimulationConfigDisplay config={currentConfigForDisplay} />
          </div>
        )}
        <div className="dashboard-column map-column">
          <SatVisualization 
            results={simulationResults} 
            selectedSatelliteId={selectedSatelliteId} // Pass state down
            onSatelliteSelect={handleSatelliteSelect} // Pass new handler
            currentTimeIndex={currentTimeIndex} // Pass state down
            setCurrentTimeIndex={setCurrentTimeIndex} // Pass setter down
          />
        </div>
      </div>

      <main className="main-content-area">
        <OrbitInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        
        {isLoading && <p className="status-message loading-message">Simulating... Please wait.</p>}
        
        {error && (
          <div className="status-message error-container">
            <h3>Simulation Error:</h3>
            <pre>{error}</pre>
          </div>
        )}
        
        {/* Old results and config display removed from here */}
      </main>
      
      {selectedSatelliteId && simulationResults && (
        <SidePanel
          selectedSatelliteId={selectedSatelliteId}
          simulationResults={simulationResults}
          onClose={handleCloseSidePanel} // Use the updated closer
          currentTimeIndex={currentTimeIndex}
          initialPosition={sidePanelInitialPosition} // Pass the position state
          isConnectionsPanelOpen={panelVisible} // Pass CurrentConnectionsPanel visibility
        />
      )}
      
      <footer className="App-footer">
        <p>SatMap V2: Orbital Simulation (UI: SatSimUI, Engine: SatCore)</p>
        <p>Made w ❤️ Aryan Rai - SatMap V2.0 ~ Sydney, Aus</p>
      </footer>
    </div>
  );
}

export default App;
