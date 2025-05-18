import React from 'react';
import { SimulationConfig, SimulationResults } from '../types/orbit';
import styles from './SimulationResultsDisplay.module.css';

interface SimulationResultsDisplayProps {
  results: SimulationResults | null;
  simulationConfig: SimulationConfig | null;
}

const SimulationResultsDisplay: React.FC<SimulationResultsDisplayProps> = ({ results, simulationConfig }) => {
  if (!results || !simulationConfig) {
    return null;
  }

  const totalSimDurationSeconds = simulationConfig.simulationDurationHours * 3600;
  let percentageInCommunication = 0;
  if (totalSimDurationSeconds > 0) {
    const communicationDurationSeconds = totalSimDurationSeconds - results.totalBlackoutDuration;
    percentageInCommunication = (communicationDurationSeconds / totalSimDurationSeconds) * 100;
  } else {
    percentageInCommunication = results.totalBlackoutDuration > 0 ? 0 : 100;
  }

  return (
    <div className={styles.resultsDisplayContainer}>
      <h3 className={styles.resultsHeader}>Simulation Results:</h3>
      <div className={styles.resultsGrid}>
        <div className={styles.resultItem}>
          <p><strong>Total Handshakes:</strong> {results.totalHandshakes}</p>
        </div>
        <div className={styles.resultItem}>
          <p><strong>Time in Communication:</strong> {percentageInCommunication.toFixed(2)}%</p>
        </div>
        <div className={styles.resultItem}>
          <p><strong>Number of Blackouts:</strong> {results.numberOfBlackouts}</p>
        </div>
        <div className={styles.resultItem}>
          <p><strong>Total Blackout Duration:</strong> {results.totalBlackoutDuration.toFixed(2)} seconds</p>
        </div>
        <div className={styles.resultItem}>
          <p><strong>Average Blackout Duration:</strong> {results.averageBlackoutDuration.toFixed(2)} seconds</p>
        </div>
      </div>
    </div>
  );
};

export default SimulationResultsDisplay; 