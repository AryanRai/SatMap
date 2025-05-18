import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
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
  const [isConsoleVisible, setIsConsoleVisible] = useState<boolean>(false); // Default to hidden

  // State for enabling/disabling the entire console feature
  const [isConsoleFeatureEnabled, setIsConsoleFeatureEnabled] = useState<boolean>(false); // Default to disabled

  // State for communication cone visibility
  const [showCommunicationCones, setShowCommunicationCones] = useState<boolean>(true);

  // State for visualization mode (2D or 3D)
  const [visualizationMode, setVisualizationMode] = useState<'2D' | '3D'>('2D');

  // 3D specific toggles
  const [showSatelliteTrails, setShowSatelliteTrails] = useState<boolean>(false);
  const [showSatelliteLabels, setShowSatelliteLabels] = useState<boolean>(true);

  // State for playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMultiplier, setPlaybackSpeedMultiplier] = useState<number>(1);
  const [isTimelapseActive, setIsTimelapseActive] = useState<boolean>(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  // State for the time range selection for display features
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const BASE_ANIMATION_INTERVAL = 200; // ms
  const TIMELAPSE_MULTIPLIER = 16; // Timelapse runs 16x faster than base speed 1x

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
    setPlaybackSpeedMultiplier(1); // Reset playback speed
    setIsTimelapseActive(false); // Reset timelapse mode
    setIsRealtimeActive(false); // Reset realtime mode
    // Reset selectedTimeRange when new simulation starts
    // It will be properly set once results.maxTimeIndex is available
    setSelectedTimeRange({ start: 0, end: 0 }); 

    try {
      let simulationStartTime: Date | undefined = undefined;
      if (config.startTimeISO && config.startTimeISO.trim() !== "") {
        simulationStartTime = new Date(config.startTimeISO);
        if (isNaN(simulationStartTime.getTime())) {
          console.warn("[App] Invalid startTimeISO provided, falling back to current time:", config.startTimeISO);
          setError("Invalid start time provided. Using current time instead.");
          simulationStartTime = undefined; // Fallback to default in runSimulation
        }
      }

      const results = await runSimulation(config, simulationStartTime);
      setSimulationResults(results);
      setCurrentConfigForDisplay(config);
      // Initialize selectedTimeRange based on new results
      if (results && results.beaconTrack && results.beaconTrack.length > 0) {
        setSelectedTimeRange({ start: 0, end: results.beaconTrack.length - 1 });
      }
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

  const toggleConsoleFeature = () => {
    setIsConsoleFeatureEnabled(prev => {
      if (prev) {
        // If disabling the feature, also hide the panel
        setIsConsoleVisible(false);
      }
      return !prev;
    });
  };

  const toggleCommunicationCones = () => {
    setShowCommunicationCones(prev => !prev);
  };

  const toggleVisualizationMode = () => {
    setVisualizationMode(prevMode => (prevMode === '2D' ? '3D' : '2D'));
  };

  const toggleSatelliteTrails = () => {
    setShowSatelliteTrails(prev => !prev);
  };

  const toggleSatelliteLabels = () => {
    setShowSatelliteLabels(prev => !prev);
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
  
  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeedMultiplier(speed);
    if (isTimelapseActive) {
        setIsTimelapseActive(false);
    }
    if (isRealtimeActive) {
        setIsRealtimeActive(false);
    }
  };

  const handleTimelapseToggle = () => {
    setIsTimelapseActive(prev => {
        const newTimelapseState = !prev;
        if (newTimelapseState) {
            setIsPlaying(true); // Automatically play when timelapse is enabled
            setIsRealtimeActive(false); // Turn off realtime if timelapse is enabled
        } else {
            // Optional: revert to a default speed or last selected speed if needed
        }
        return newTimelapseState;
    });
  };

  const handleRealtimeToggle = () => {
    setIsRealtimeActive(prev => {
        const newRealtimeState = !prev;
        if (newRealtimeState) {
            setIsPlaying(true); // Automatically play when realtime is enabled
            setIsTimelapseActive(false); // Turn off timelapse if realtime is enabled
            // Playback speed multiplier is ignored in realtime mode
        }
        return newRealtimeState;
    });
  };

  const handleTimeRangeChange = (newRange: { start: number; end: number }) => {
    setSelectedTimeRange(newRange);
    // If currentTimeIndex is outside the new range, consider adjusting it or pausing.
    // For now, let's ensure currentTimeIndex is at least within the new start.
    // A more sophisticated handling might be needed based on desired UX.
    if (currentTimeIndex < newRange.start) {
      setCurrentTimeIndex(newRange.start);
    }
    if (currentTimeIndex > newRange.end) {
      // If current time is past the new end, set it to the new end.
      // Or potentially pause playback if it was playing.
      setCurrentTimeIndex(newRange.end);
    }
  };

  // Effect for animation progression
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isPlaying && hasSimulationRun && maxTimeIndex > 0) {
        let intervalDuration;
        if (isRealtimeActive) {
            if (currentConfigForDisplay && currentConfigForDisplay.simulationTimeStepSec > 0) {
                intervalDuration = currentConfigForDisplay.simulationTimeStepSec * 1000; // Use simulationTimeStepSec from config
            } else {
                console.warn("Realtime mode active but simulationTimeStepSec from config is unavailable. Defaulting to 1s/step.");
                intervalDuration = 1000;
            }
        } else if (isTimelapseActive) {
            intervalDuration = BASE_ANIMATION_INTERVAL / TIMELAPSE_MULTIPLIER;
        } else {
            intervalDuration = BASE_ANIMATION_INTERVAL / playbackSpeedMultiplier;
        }
        
        intervalId = setInterval(() => {
            setCurrentTimeIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                if (nextIndex > maxTimeIndex) {
                    setIsPlaying(false); // Stop when end is reached
                    if (isTimelapseActive) setIsTimelapseActive(false); // Turn off timelapse if it was on
                    // Realtime mode does not auto-disable, it just stops playing.
                    return maxTimeIndex;
                }
                return nextIndex;
            });
        }, intervalDuration);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
}, [isPlaying, hasSimulationRun, maxTimeIndex, setCurrentTimeIndex, playbackSpeedMultiplier, isTimelapseActive, isRealtimeActive, currentConfigForDisplay]);

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
        <button onClick={toggleConsoleFeature} className="panel-toggle-button console-feature-toggle-button">
          {isConsoleFeatureEnabled ? 'Disable Console Feature' : 'Enable Console Feature'}
        </button>
        {isConsoleFeatureEnabled && (
          <button onClick={toggleConsolePanel} className="panel-toggle-button console-toggle-button">
            {isConsoleVisible ? 'Hide Console' : 'Show Console'}
          </button>
        )}
        <button onClick={toggleCommunicationCones} className="panel-toggle-button cones-toggle-button">
          {showCommunicationCones ? 'Hide FOV Cones' : 'Show FOV Cones'}
        </button>
        {visualizationMode === '3D' && (
          <>
            <button onClick={toggleSatelliteTrails} className="panel-toggle-button trails-toggle-button">
              {showSatelliteTrails ? 'Hide Trails (3D)' : 'Show Trails (3D)'}
            </button>
            <button onClick={toggleSatelliteLabels} className="panel-toggle-button labels-toggle-button">
              {showSatelliteLabels ? 'Hide Labels (3D)' : 'Show Labels (3D)'}
            </button>
          </>
        )}
        <button onClick={toggleVisualizationMode} className="panel-toggle-button view-mode-toggle-button">
          {visualizationMode === '2D' ? 'Switch to 3D View' : 'Switch to 2D View'}
        </button>
        <h1>🛰️ SatMap: Satellite Handshake Simulator V3.0</h1>
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
          playbackSpeedMultiplier={playbackSpeedMultiplier}
          onPlaybackSpeedChange={handlePlaybackSpeedChange}
          isTimelapseActive={isTimelapseActive}
          onTimelapseToggle={handleTimelapseToggle}
          isRealtimeActive={isRealtimeActive}
          onRealtimeToggle={handleRealtimeToggle}
          selectedTimeRange={selectedTimeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />
      )}

      <div className={`dashboard-layout ${panelVisible ? 'panel-open' : ''}`}>
        {simulationResults && currentConfigForDisplay && (
          <div className="dashboard-column results-column">
            <SimulationResultsDisplay results={simulationResults} simulationConfig={currentConfigForDisplay} />
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
              selectedTimeRange={selectedTimeRange} // Ensure this line is added
            />
          ) : (
            <SatVisualization3D
              results={simulationResults}
              currentTimeIndex={currentTimeIndex}
              showCommunicationCones={showCommunicationCones}
              beaconFovDeg={currentConfigForDisplay?.beaconFovDeg}
              iridiumFovDeg={currentConfigForDisplay?.iridiumFovDeg}
              selectedSatelliteId={selectedSatelliteId}
              onSatelliteSelect={handleSatelliteSelect}
              showSatelliteTrails={showSatelliteTrails}
              showSatelliteLabels={showSatelliteLabels}
              selectedTimeRange={selectedTimeRange} // Pass to 3D visualization
            />
          )}
        </div>
      </div>

      <main className="main-content-area">
        <OrbitInputForm 
          isLoading={isLoading}
          onSubmit={handleFormSubmit}
        />
        
        {isConsoleFeatureEnabled && (
          <ConsolePanel 
            isVisible={isConsoleVisible} 
            onClose={toggleConsolePanel} 
          />
        )}
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Simulating... Please Wait...</p>
          </div>
        )}
        
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
        <p>SatMap V3: Orbital Simulation (UI: SatSimUI, Engine: SatCore)</p>
        <p>Made w ❤️ Aryan Rai <a href="https://aryanrai.github.io/" className="footer-link">Web</a> | <a href="https://github.com/AryanRai/SatMap" className="footer-link">GitHub</a></p>
        <p>~Sydney, Aus</p>
      </footer>
    </div>
  );
}

export default App;
