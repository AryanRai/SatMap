import React from 'react';
import { SimulationResults } from '../types/orbit';
import styles from './SimulationResultsDisplay.module.css';

interface SimulationResultsDisplayProps {
  results: SimulationResults | null;
}

const SimulationResultsDisplay: React.FC<SimulationResultsDisplayProps> = ({ results }) => {
  if (!results) {
    return null;
  }

  return (
    <div className={styles.resultsDisplayContainer}>
      <h3 className={styles.resultsHeader}>Simulation Results:</h3>
      <div className={styles.resultsGrid}>
        <div className={styles.resultItem}>
          <p><strong>Total Handshakes:</strong> {results.totalHandshakes}</p>
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