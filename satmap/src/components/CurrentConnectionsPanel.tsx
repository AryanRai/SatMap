import React from 'react';
import { SimulationResults } from '../types/orbit';
import styles from './CurrentConnectionsPanel.module.css';

interface CurrentConnectionsPanelProps {
  results: SimulationResults | null;
  currentTimeIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onMouseEnterPanel: () => void; // For hover-based persistence
  onMouseLeavePanel: () => void; // For hover-based auto-hide
  setSelectedSatelliteId: (id: string | null) => void; // New prop
}

const CurrentConnectionsPanel: React.FC<CurrentConnectionsPanelProps> = ({
  results,
  currentTimeIndex,
  isOpen,
  onClose,
  onMouseEnterPanel,
  onMouseLeavePanel,
  setSelectedSatelliteId // New prop
}) => {
  if (!isOpen) {
    return null;
  }

  const currentBeaconPos = results?.beaconTrack?.[currentTimeIndex]?.positionGeodetic;
  const activeLinksAtCurrentTime = results?.activeLinksLog?.[currentTimeIndex] || new Set<string>();
  const currentlyConnectedIds = Array.from(activeLinksAtCurrentTime);

  let previouslyConnectedIds: string[] = [];
  let neverConnectedIds: string[] = [];

  if (results && results.iridiumTracks && results.activeLinksLog) {
    const allIridiumIds = Object.keys(results.iridiumTracks);
    const everConnectedOverall = new Set<string>(); // All satellites that have ever connected in the entire simulation
    const connectedBeforeCurrentTime = new Set<string>(); // Satellites connected at any point *before* the currentTimeIndex

    for (let i = 0; i < results.activeLinksLog.length; i++) {
      const linksAt_i = results.activeLinksLog[i];
      if (linksAt_i) {
        linksAt_i.forEach(id => {
          everConnectedOverall.add(id); // Track for 'never connected'
          if (i < currentTimeIndex) {
            connectedBeforeCurrentTime.add(id); // Track for 'previously connected'
          }
        });
      }
    }

    previouslyConnectedIds = allIridiumIds.filter(id => 
      !activeLinksAtCurrentTime.has(id) && // Not currently connected
      connectedBeforeCurrentTime.has(id)    // But was connected at some point strictly before current time
    ).sort();

    neverConnectedIds = allIridiumIds.filter(id => !everConnectedOverall.has(id)).sort();
  }

  const panelClassName = isOpen 
    ? `${styles.connectionsPanel} ${styles.visible}` 
    : styles.connectionsPanel;

  const handleSatelliteClick = (id: string) => {
    setSelectedSatelliteId(id);
    // Optionally, could also trigger panel to close if it was hover-opened
    // onClose(); // Or a more nuanced close
  };

  const renderSatelliteList = (satIds: string[], title: string) => (
    <div className={styles.section}>
      <h4>{title} ({satIds.length})</h4>
      {satIds.length > 0 ? (
        <ul>
          {satIds.map(id => (
            <li key={id} onClick={() => handleSatelliteClick(id)} className={styles.clickableSatellite}>
              {id}
            </li>
          ))}
        </ul>
      ) : (
        <p>None.</p>
      )}
    </div>
  );

  return (
    <div 
      className={panelClassName}
      onMouseEnter={onMouseEnterPanel}
      onMouseLeave={onMouseLeavePanel}
    >
      <div className={styles.panelHeader}>
        <h3>Iridium Status</h3>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>
      <div className={styles.panelContent}>
        {results ? (
          <>
            {currentBeaconPos && (
              <div className={styles.section}>
                <h4>Beacon Position:</h4>
                <p>Lat: {currentBeaconPos.latitude.toFixed(2)}°</p>
                <p>Lon: {currentBeaconPos.longitude.toFixed(2)}°</p>
                <p>Alt: {currentBeaconPos.altitude.toFixed(2)} km</p>
              </div>
            )}
            {renderSatelliteList(currentlyConnectedIds, "Currently Connected")}
            {renderSatelliteList(previouslyConnectedIds, "Previously Connected (Not Current)")}
            {renderSatelliteList(neverConnectedIds, "Never Connected")}
          </>
        ) : (
          <p>No simulation data loaded.</p>
        )}
      </div>
    </div>
  );
};

export default CurrentConnectionsPanel; 