import React, { useState, useEffect } from 'react';
import './App.css'; 
import OrbitInputForm from './components/OrbitInputForm';
import { SimulationConfig, SimulationResults } from './types/orbit';
import { runSimulation } from './simulationEngine';
import SatVisualization from './components/SatVisualization';
import IntroAnimationV2 from './components/IntroAnimationV2/IntroAnimationV2'; 
import ParallaxEarthSection from './components/ParallaxEarthSection/ParallaxEarthSection';
import PersistentStarfield from './components/PersistentStarfield/PersistentStarfield';
// ScrollFollowingSatellite is NO LONGER NEEDED as its functionality is merged into IntroAnimationV2

function App() {
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFormSubmit = async (config: SimulationConfig) => {
    setIsLoading(true);
    setSimulationResults(null);
    setError(null);
    try {
      const results = await runSimulation(config); 
      setSimulationResults(results);
    } catch (e: any) {
      console.error('Simulation failed in App:', e);
      setError(e.message || 'An unexpected error occurred during simulation.');
    }
    setIsLoading(false); 
  };

  return (
    <div className="App">
      {/* Layer 1: Persistent "traveling through space" stars always in the very background */}
      <PersistentStarfield />

      {/* Layer 2: Initial satellite and title animation (occupies 100vh) */}
      {/* This component now also handles the satellite moving to the side on scroll */}
      <IntroAnimationV2 /> 

      {/* Layer 3: Parallaxing Earth and the main scrollable content */}
      <ParallaxEarthSection scrollSpeedFactor={0.2}>
        
        <div className="main-content-area" style={{ 
            backgroundColor: 'rgba(10, 10, 20, 0.65)', 
            color: '#e8e8f0', 
            // Increased left padding to make space for the satellite when it's on the side
            // Adjust this based on the final size and position of the side satellite
            padding: '50px 20px 40px 150px', // e.g., 150px left padding
            minHeight: '120vh', 
            position: 'relative', 
            zIndex: 2 
          }}>
          
          <main>
            <OrbitInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
            
            {isLoading && <p className="status-message" style={{ marginTop: '20px', textAlign: 'center' }}>Simulating... Please wait.</p>}
            
            {error && (
              <div className="simulation-error-container" style={{
                color: '#ffcccc', 
                backgroundColor: 'rgba(100, 0, 0, 0.6)', 
                padding: '15px', 
                borderRadius: '8px',
                marginTop: '20px',
                border: '1px solid rgba(255,100,100,0.5)'
              }}>
                <h3 style={{marginTop: 0, borderBottom: '1px solid rgba(255,150,150,0.5)', paddingBottom: '10px'}}>Simulation Error:</h3>
                <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}>{error}</pre> 
              </div>
            )}
            
            {simulationResults && (
              <div style={{marginTop: '30px'}}>
                <div className="simulation-results-container" style={{
                  padding: '20px', 
                  backgroundColor: 'rgba(40, 40, 70, 0.7)', 
                  borderRadius: '8px',
                  marginBottom: '30px'
                }}>
                  <h2 style={{borderBottom: '1px solid #777', paddingBottom: '10px', marginBottom: '15px'}}>Simulation Results:</h2>
                  <p><strong>Total Handshakes:</strong> {simulationResults.totalHandshakes}</p>
                  <p><strong>Number of Blackouts:</strong> {simulationResults.numberOfBlackouts}</p>
                  <p><strong>Total Blackout Duration:</strong> {simulationResults.totalBlackoutDuration.toFixed(2)} seconds</p>
                  <p><strong>Average Blackout Duration:</strong> {simulationResults.averageBlackoutDuration.toFixed(2)} seconds</p>
                </div>
                {simulationResults.beaconTrack && simulationResults.iridiumTracks && (
                  <SatVisualization results={simulationResults} />
                )}
              </div>
            )}
          </main>
          <footer className="App-footer" style={{
            color: '#bbb', 
            borderTop: '1px solid #555', 
            marginTop: '60px', 
            paddingTop: '30px', 
            textAlign: 'center',
            fontSize: '0.9em'
          }}>
            <p>SatMap: Orbital Simulation (UI: SatSimUI, Engine: SatCore)</p>
            <p>Made w ❤️ Aryan Rai - SatMap V1.0 ~ Sydney, Aus</p>
          </footer>
        </div>
      </ParallaxEarthSection>
    </div>
  );
}

export default App;
