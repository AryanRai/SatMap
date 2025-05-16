import React, { useState } from 'react';
import './App.css';
import OrbitInputForm from './components/OrbitInputForm';
import { SimulationConfig, SimulationResults, OrbitType } from './types/orbit';
import { runSimulation } from './simulationEngine';
import SatVisualization from './components/SatVisualization';

function App() {
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (config: SimulationConfig) => {
    setIsLoading(true);
    setSimulationResults(null);
    setError(null);
    console.log('Starting simulation with params:', config);

    try {
      // For testing, you can provide a specific start time if needed
      // const startTime = new Date('2024-05-17T00:00:00.000Z');
      // const results = await runSimulation(config, startTime);
      const results = await runSimulation(config);
      console.log('Simulation successful:', results);
      setSimulationResults(results);
    } catch (e: any) {
      console.error('Simulation failed:', e);
      setError(e.message || 'An unexpected error occurred during simulation.');
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Satellite Handshake Simulator</h1>
      </header>
      <main>
        <OrbitInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        
        {isLoading && <p style={{ marginTop: '20px' }}>Simulating... Please wait.</p>}
        
        {error && (
          <div className="simulation-error-container">
            <h3>Simulation Error:</h3>
            <pre>{error}</pre>
          </div>
        )}
        
        {simulationResults && (
          <>
            <div className="simulation-results-container">
              <h2>Simulation Results:</h2>
              <p><strong>Total Handshakes:</strong> {simulationResults.totalHandshakes}</p>
              <p><strong>Number of Blackouts:</strong> {simulationResults.numberOfBlackouts}</p>
              <p><strong>Total Blackout Duration:</strong> {simulationResults.totalBlackoutDuration.toFixed(2)} seconds</p>
              <p><strong>Average Blackout Duration:</strong> {simulationResults.averageBlackoutDuration.toFixed(2)} seconds</p>
            </div>
            {simulationResults.beaconTrack && simulationResults.iridiumTracks && (
              <SatVisualization results={simulationResults} />
            )}
          </>
        )}
      </main>
      <footer className="App-footer">
        <p>Hackathon Project - Space Handshakes</p>
      </footer>
    </div>
  );
}

export default App;
