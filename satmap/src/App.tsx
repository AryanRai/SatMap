import React, { useState } from 'react';
import './App.css';
import OrbitInputForm from './components/OrbitInputForm';
import { SimulationConfig, SimulationResults } from './types/orbit';
import { runSimulation } from './simulationEngine';
import SatVisualization from './components/SatVisualization';

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

  /**
   * Handles the submission of the orbit parameters form.
   * It triggers the simulation engine with the provided configuration.
   * Updates loading, results, and error states accordingly.
   * @param config The SimulationConfig object from the OrbitInputForm.
   */
  const handleFormSubmit = async (config: SimulationConfig) => {
    setIsLoading(true);
    setSimulationResults(null);
    setError(null);
    // console.log('Starting simulation with params:', config); // Developer log, can be removed for production

    try {
      // The simulation can be started with a specific Date object if needed for reproducible scenarios.
      // Example: const startTime = new Date('2024-08-15T00:00:00.000Z');
      // const results = await runSimulation(config, startTime);
      const results = await runSimulation(config); // Uses current time by default
      // console.log('Simulation successful:', results); // Developer log
      setSimulationResults(results);
    } catch (e: any) {
      console.error('Simulation failed in App:', e); // Log the full error object for debugging
      setError(e.message || 'An unexpected error occurred during simulation.');
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>SatMap: Satellite Handshake Simulator</h1>
      </header>
      <main>
        {/* Component for user input of orbit parameters and simulation settings */}
        <OrbitInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        
        {/* Display a loading message while the simulation is running */}
        {isLoading && <p className="status-message" style={{ marginTop: '20px' }}>Simulating... Please wait.</p>}
        
        {/* Display any errors that occurred during the simulation */}
        {error && (
          <div className="simulation-error-container">
            <h3>Simulation Error:</h3>
            <pre>{error}</pre> {/* Using <pre> to preserve error message formatting */}
          </div>
        )}
        
        {/* Display the simulation results and visualization once available */}
        {simulationResults && (
          <>
            <div className="simulation-results-container">
              <h2>Simulation Results:</h2>
              <p><strong>Total Handshakes:</strong> {simulationResults.totalHandshakes}</p>
              <p><strong>Number of Blackouts:</strong> {simulationResults.numberOfBlackouts}</p>
              <p><strong>Total Blackout Duration:</strong> {simulationResults.totalBlackoutDuration.toFixed(2)} seconds</p>
              <p><strong>Average Blackout Duration:</strong> {simulationResults.averageBlackoutDuration.toFixed(2)} seconds</p>
            </div>
            {/* Render the satellite visualization component if track data is available */}
            {simulationResults.beaconTrack && simulationResults.iridiumTracks && (
              <SatVisualization results={simulationResults} />
            )}
          </>
        )}
      </main>
      <footer className="App-footer">
        <p>SatMap: Orbital Simulation (UI: SatSimUI, Engine: SatCore)</p>
        <p>Made w ❤️ Aryan Rai - SatMap V1.0 ~ Sydney, Aus</p>
      </footer>
    </div>
  );
}

export default App;
