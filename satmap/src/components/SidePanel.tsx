import React from 'react';
import { SimulationResults, Handshake, SatellitePosition } from '../types/orbit';
import styles from './SidePanel.module.css'; // Import CSS module

/**
 * Props for the SidePanel component.
 */
interface SidePanelProps {
  /** The ID of the currently selected satellite. If null, the panel is not displayed. */
  selectedSatelliteId: string | null;
  /** The complete results of the simulation, containing tracks, logs, etc. */
  simulationResults: SimulationResults | null;
  /** Function to call when the side panel's close button is clicked. */
  onClose: () => void;
  /** The current time index of the simulation playback, to get current satellite data. */
  currentTimeIndex: number; // Added to get current data for the selected satellite
}

/**
 * SidePanel component.
 * Displays detailed information about a selected satellite, including its ID,
 * current status (position, active link), and handshake history with the Beacon.
 */
const SidePanel: React.FC<SidePanelProps> = ({ 
    selectedSatelliteId, 
    simulationResults, 
    onClose, 
    currentTimeIndex 
}) => {
  // Early exit if no satellite is selected or essential simulation results are missing.
  if (!selectedSatelliteId || !simulationResults) {
    return null;
  }

  const { handshakeLog, beaconTrack, iridiumTracks, activeLinksLog } = simulationResults;

  // Filter handshakes specific to the selected satellite.
  const satelliteHandshakes = handshakeLog?.filter((h: Handshake) => 
    (selectedSatelliteId === 'BEACON' && h.iridiumSatelliteId) || // Show all handshakes if Beacon is selected (from Iridium perspective)
    (h.iridiumSatelliteId === selectedSatelliteId) // Show handshakes for a specific Iridium satellite
  ) || [];

  // Determine current position of the selected satellite
  let currentPosition: SatellitePosition | null | undefined = null;
  let satelliteName = selectedSatelliteId;

  if (selectedSatelliteId === 'BEACON') {
    currentPosition = beaconTrack?.[currentTimeIndex];
    satelliteName = 'Beacon';
  } else if (iridiumTracks && iridiumTracks[selectedSatelliteId]) {
    currentPosition = iridiumTracks[selectedSatelliteId]?.[currentTimeIndex];
  }

  // Check if the selected Iridium satellite currently has an active link with the Beacon
  const isActiveLink = selectedSatelliteId !== 'BEACON' && 
                       activeLinksLog?.[currentTimeIndex]?.has(selectedSatelliteId);

  return (
    <div className={styles.sidePanel}>
      <button onClick={onClose} className={styles.closeButton} title="Close Panel">
        &times; {/* Close button (times symbol) */}
      </button>
      <h3 className={styles.panelHeader}>
        {satelliteName} Details
      </h3>

      {/* Display current satellite information */}
      <div className={styles.currentStatusSection}>
        <h4 className={styles.sectionTitle}>Current Status:</h4>
        {currentPosition ? (
          <ul className={styles.statusList}>
            <li>Lat: {currentPosition.positionGeodetic.latitude.toFixed(2)}&deg;</li>
            <li>Lon: {currentPosition.positionGeodetic.longitude.toFixed(2)}&deg;</li>
            <li>Alt: {currentPosition.positionGeodetic.altitude.toFixed(2)} km</li>
            {selectedSatelliteId !== 'BEACON' && (
                 <li>Active Link with Beacon: {isActiveLink ? 'Yes' : 'No'}</li>
            )}
          </ul>
        ) : (
          <p>Current position data not available.</p>
        )}
      </div>

      {/* Display handshake history */}
      <div className={styles.handshakeSection}>
        <h4 className={styles.sectionTitle}>Handshake History (with {selectedSatelliteId === 'BEACON' ? 'Iridium Constellation' : 'Beacon'}):</h4>
        {satelliteHandshakes.length > 0 ? (
          <ul className={styles.handshakeList}>
            {satelliteHandshakes.map((shake: Handshake, index: number) => (
              <li key={index} className={styles.handshakeItem}>
                <strong>Time:</strong> {new Date(shake.timestamp).toLocaleString()}<br />
                Beacon @ Lon/Lat: {shake.beaconPosition.longitude.toFixed(2)}&deg; / {shake.beaconPosition.latitude.toFixed(2)}&deg;<br />
                {shake.iridiumSatelliteId} @ Lon/Lat: {shake.iridiumPosition.longitude.toFixed(2)}&deg; / {shake.iridiumPosition.latitude.toFixed(2)}&deg;
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noHandshakes}>
            No recorded handshakes {selectedSatelliteId === 'BEACON' ? 'in log' : `with ${satelliteName}`}.
          </p>
        )}
      </div>
    </div>
  );
};

export default SidePanel; 