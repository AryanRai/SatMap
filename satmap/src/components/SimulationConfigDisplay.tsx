import React from 'react';
import { SimulationConfig, OrbitType, SunSynchronousOrbitParams, NonPolarOrbitParams } from '../types/orbit';
import styles from './SimulationConfigDisplay.module.css'; // We'll create this CSS module

interface SimulationConfigDisplayProps {
  config: SimulationConfig | null;
}

const SimulationConfigDisplay: React.FC<SimulationConfigDisplayProps> = ({ config }) => {
  if (!config) {
    return null;
  }

  const { 
    beaconParams,
    iridiumFovDeg,
    beaconFovDeg,
    simulationDurationHours,
    simulationTimeStepSec,
    iridiumDatasetSources
  } = config;

  return (
    <div className={styles.configDisplayContainer}>
      <h3 className={styles.configHeader}>Simulation Configuration Used:</h3>
      <div className={styles.configGrid}>
        <div className={styles.configSection}>
          <h4>Beacon Orbit:</h4>
          <p><strong>Type:</strong> {beaconParams.type}</p>
          <p><strong>Altitude:</strong> {beaconParams.altitude} km</p>
          {beaconParams.type === OrbitType.SunSynchronous && (
            <p><strong>LST at Desc. Node:</strong> {(beaconParams as SunSynchronousOrbitParams).localSolarTimeAtDescendingNode} hrs</p>
          )}
          {beaconParams.type === OrbitType.NonPolar && (
            <>
              <p><strong>Inclination:</strong> {(beaconParams as NonPolarOrbitParams).inclination}°</p>
              {(beaconParams as NonPolarOrbitParams).raan !== undefined && (
                 <p><strong>RAAN:</strong> {(beaconParams as NonPolarOrbitParams).raan}°</p>
              )}
            </>
          )}
        </div>

        <div className={styles.configSection}>
          <h4>Simulation Parameters:</h4>
          <p><strong>Iridium FOV:</strong> {iridiumFovDeg}°</p>
          <p><strong>Beacon FOV:</strong> {beaconFovDeg}°</p>
          <p><strong>Duration:</strong> {simulationDurationHours} hrs</p>
          <p><strong>Time Step:</strong> {simulationTimeStepSec} sec</p>
        </div>

        <div className={styles.configSection}>
          <h4>Iridium Datasets:</h4>
          {iridiumDatasetSources && iridiumDatasetSources.length > 0 ? (
            <ul>
              {iridiumDatasetSources.map(src => <li key={src}>{src}</li>)}
            </ul>
          ) : (
            <p>N/A</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationConfigDisplay; 