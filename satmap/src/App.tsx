import React, { useState } from 'react';
import './App.css';
import OrbitInputForm from './components/OrbitInputForm';
import { SimulationConfig, SimulationResults } from './types/orbit';
import { runSimulation } from './simulationEngine';
import SatVisualization from './components/SatVisualization';
import SimulationConfigDisplay from './components/SimulationConfigDisplay';

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
    setCurrentConfigForDisplay(null); // Clear previous config display

    try {
      const results = await runSimulation(config);
      setSimulationResults(results);
      setCurrentConfigForDisplay(config); // Store the config that produced these results
    } catch (e: any) {
      console.error('Simulation failed in App:', e);
      setError(e.message || 'An unexpected error occurred during simulation.');
      // Optionally, clear config for display if simulation fails, or keep it to show what was attempted
      // setCurrentConfigForDisplay(null); 
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🛰️ SatMap: Satellite Handshake Simulator V2</h1>
      </header>
      
      {/* SatVisualization is now always rendered at the top */}
      {/* It will need to handle a "blank" or "no data" state internally */}
      <SatVisualization results={simulationResults} />

      <main className="main-content-area">
        {/* OrbitInputForm is now below the map visualization */}
        <OrbitInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        
        {isLoading && <p className="status-message loading-message">Simulating... Please wait.</p>}
        
        {error && (
          <div className="status-message error-container">
            <h3>Simulation Error:</h3>
            <pre>{error}</pre>
          </div>
        )}
        
        {/* Display the simulation results and the config used, below the form */}
        {simulationResults && (
          <div className="results-and-config-section">
            <div className="simulation-results-container">
              <h2>Simulation Results:</h2>
              <p><strong>Total Handshakes:</strong> {simulationResults.totalHandshakes}</p>
              <p><strong>Number of Blackouts:</strong> {simulationResults.numberOfBlackouts}</p>
              <p><strong>Total Blackout Duration:</strong> {simulationResults.totalBlackoutDuration.toFixed(2)} seconds</p>
              <p><strong>Average Blackout Duration:</strong> {simulationResults.averageBlackoutDuration.toFixed(2)} seconds</p>
            </div>

            {/* Display the configuration that was used for these results */}
            <SimulationConfigDisplay config={currentConfigForDisplay} />
          </div>
        )}
      </main>
      
      <footer className="App-footer">
        <p>SatMap V2: Orbital Simulation (UI: SatSimUI, Engine: SatCore)</p>
        <p>Made w ❤️ Aryan Rai - SatMap V2.0 ~ Sydney, Aus</p>
      </footer>
    </div>
  );
}

export default App;
