import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import OrbitInputForm from './components/OrbitInputForm';
import { SimulationConfig, SimulationResults } from './types/orbit';
import { runSimulation } from './simulationEngine';
import SatVisualization from './components/SatVisualization';
import SatVisualization3D from './components/SatVisualization3D';
import PlaybackControls from './components/PlaybackControls';
import SimulationConfigDisplay from './components/SimulationConfigDisplay';
import SimulationResultsDisplay from './components/SimulationResultsDisplay';
import CurrentConnectionsPanel from './components/CurrentConnectionsPanel';
import SidePanel from './components/SidePanel';
import ConsolePanel from './components/ConsolePanel';

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

  // State for ConsolePanel visibility
  const [isConsoleVisible, setIsConsoleVisible] = useState<boolean>(true); // Default to visible

  // State for communication cone visibility
  const [showCommunicationCones, setShowCommunicationCones] = useState<boolean>(false);

  // State for visualization mode (2D or 3D)
  const [visualizationMode, setVisualizationMode] = useState<'2D' | '3D'>('2D');

  // State for playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const ANIMATION_SPEED_MS = 200; // Can be made configurable later

  /**
   * Handles the submission of the orbit parameters form.
   * It triggers the simulation engine with the provided configuration.
   * Updates loading, results, error, and displayed config states accordingly.
   * @param config The SimulationConfig object from the OrbitInputForm.
   */
  const handleFormSubmit = async (config: SimulationConfig) => {
    console.log("[App] New simulation run started with config:", config); // Example log
    setIsLoading(true);
    setSimulationResults(null);
    setError(null);
    setCurrentConfigForDisplay(null);
    setCurrentTimeIndex(0); // Reset time index on new simulation
    setSelectedSatelliteId(null); // Clear selected satellite on new simulation
    setSidePanelInitialPosition(null); // Clear panel position on new simulation
    setIsPlaying(false); // Stop playback on new simulation

    try {
      const results = await runSimulation(config);
      setSimulationResults(results);
      setCurrentConfigForDisplay(config);
      console.info("[App] Simulation completed successfully.", results); // Example log
    } catch (e: any) {
      console.error('Simulation failed in App:', e);
      setError(e.message || 'An unexpected error occurred during simulation.');
    }
    setIsLoading(false);
    setVisualizationMode(prevMode => (prevMode === '2D' ? '3D' : '2D'));
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

  const toggleConsolePanel = () => {
    setIsConsoleVisible(prev => !prev);
  };

  const toggleCommunicationCones = () => {
    setShowCommunicationCones(prev => !prev);
  };

  const toggleVisualizationMode = () => {
    setVisualizationMode(prevMode => (prevMode === '2D' ? '3D' : '2D'));
  };

  // Playback control handlers
  const maxTimeIndex = simulationResults?.beaconTrack?.length ? simulationResults.beaconTrack.length - 1 : 0;
  const currentTimestamp = simulationResults?.beaconTrack?.[currentTimeIndex]?.timestamp ?? null;
  const hasSimulationRun = !!simulationResults;

  const handlePlayPause = () => {
    if (!hasSimulationRun) return;
    if (currentTimeIndex >= maxTimeIndex && !isPlaying && maxTimeIndex > 0) {
      setCurrentTimeIndex(0); // Restart if at end
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasSimulationRun) return;
    setIsPlaying(false); // Pause when slider is manually changed
    setCurrentTimeIndex(Number(event.target.value));
  };

  const handleResetTime = () => {
    if (!hasSimulationRun) return;
    setIsPlaying(false);
    setCurrentTimeIndex(0);
  };
  
  // Effect for animation progression
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isPlaying && hasSimulationRun && maxTimeIndex > 0) {
        intervalId = setInterval(() => {
            setCurrentTimeIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                if (nextIndex > maxTimeIndex) {
                    setIsPlaying(false); // Stop when end is reached
                    return maxTimeIndex;
                }
                return nextIndex;
            });
        }, ANIMATION_SPEED_MS);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
}, [isPlaying, hasSimulationRun, maxTimeIndex, setCurrentTimeIndex]);

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
        <button onClick={toggleConsolePanel} className="panel-toggle-button console-toggle-button">
          {isConsoleVisible ? 'Hide Console' : 'Show Console'}
        </button>
        <button onClick={toggleCommunicationCones} className="panel-toggle-button cones-toggle-button">
          {showCommunicationCones ? 'Hide FOV Cones' : 'Show FOV Cones'}
        </button>
        <button onClick={toggleVisualizationMode} className="panel-toggle-button view-mode-toggle-button">
          {visualizationMode === '2D' ? 'Switch to 3D View' : 'Switch to 2D View'}
        </button>
        <h1>🛰️ SatMap: Satellite Handshake Simulator V2</h1>
      </header>
      
      {/* Playback Controls - Placed above the main dashboard layout */}
      {hasSimulationRun && (
        <PlaybackControls 
          currentTimeIndex={currentTimeIndex}
          maxTimeIndex={maxTimeIndex}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onSliderChange={handleSliderChange}
          onResetTime={handleResetTime}
          currentTimestamp={currentTimestamp}
          hasSimulationData={hasSimulationRun}
        />
      )}

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
          {visualizationMode === '2D' ? (
            <SatVisualization 
              results={simulationResults} 
              selectedSatelliteId={selectedSatelliteId} // Pass state down
              onSatelliteSelect={handleSatelliteSelect} // Pass new handler
              currentTimeIndex={currentTimeIndex} // Pass state down
              setCurrentTimeIndex={setCurrentTimeIndex} // Pass setter down
              showCommunicationCones={showCommunicationCones} // Pass down state
              beaconFovDeg={currentConfigForDisplay?.beaconFovDeg} // Pass down FOV
              iridiumFovDeg={currentConfigForDisplay?.iridiumFovDeg} // Pass down FOV
            />
          ) : (
            <SatVisualization3D
              results={simulationResults}
              currentTimeIndex={currentTimeIndex}
              showCommunicationCones={showCommunicationCones}
              beaconFovDeg={currentConfigForDisplay?.beaconFovDeg}
              iridiumFovDeg={currentConfigForDisplay?.iridiumFovDeg}
            />
          )}
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
      
      {/* Render ConsolePanel */}
      <ConsolePanel 
        isVisible={isConsoleVisible} 
        onClose={toggleConsolePanel} 
      />
      
      <footer className="App-footer">
        <p>SatMap V2: Orbital Simulation (UI: SatSimUI, Engine: SatCore)</p>
        <p>Made w ❤️ Aryan Rai - SatMap V2.0 ~ Sydney, Aus</p>
      </footer>
    </div>
  );
}

export default App;
