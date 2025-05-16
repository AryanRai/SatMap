import React from 'react';
import { SimulationResults, Handshake } from '../types/orbit';
import styles from './SidePanel.module.css'; // Import CSS module

interface SidePanelProps {
  selectedSatelliteId: string | null;
  simulationResults: SimulationResults | null;
  onClose: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ selectedSatelliteId, simulationResults, onClose }) => {
  if (!selectedSatelliteId || !simulationResults || !simulationResults.handshakeLog) {
    return null; // Don't render if no satellite is selected, no results, or no handshakeLog
  }

  const { handshakeLog } = simulationResults;

  // Filter handshakes for the selected satellite
  const satelliteHandshakes = handshakeLog.filter((h: Handshake) => h.iridiumSatelliteId === selectedSatelliteId);

  return (
    <div className={styles.sidePanel}>
      <button onClick={onClose} className={styles.closeButton}>
        &times;
      </button>
      <h3 className={styles.panelHeader}>
        {selectedSatelliteId}
      </h3>
      {satelliteHandshakes.length > 0 ? (
        <div>
          <h4 style={{ marginBottom: '10px', color: '#bbb' }}>Handshake History:</h4>
          <ul className={styles.handshakeList}>
            {satelliteHandshakes.map((shake: Handshake, index: number) => (
              <li key={index} className={styles.handshakeItem}>
                <strong>Time:</strong> {new Date(shake.timestamp).toLocaleString()}<br />
                Beacon Lon/Lat: {shake.beaconPosition.longitude.toFixed(2)}&deg; / {shake.beaconPosition.latitude.toFixed(2)}&deg;<br />
                Iridium Lon/Lat: {shake.iridiumPosition.longitude.toFixed(2)}&deg; / {shake.iridiumPosition.latitude.toFixed(2)}&deg;
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.noHandshakes}>No recorded handshakes with the Beacon for this satellite.</p>
      )}
      {/* Add more details here as needed, e.g., current position, status etc. */}
    </div>
  );
};

export default SidePanel; 