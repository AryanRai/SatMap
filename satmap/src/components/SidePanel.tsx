import React, { useState, useEffect, useRef } from 'react';
import { SimulationResults, GeodeticPosition, Handshake } from '../types/orbit';
import styles from './SidePanel.module.css';

/**
 * Props for the SidePanel component.
 */
interface SidePanelProps {
  /** The ID of the currently selected satellite. If null, the panel is not displayed. */
  selectedSatelliteId: string;
  /** The complete results of the simulation, containing tracks, logs, etc. */
  simulationResults: SimulationResults;
  /** Function to call when the side panel's close button is clicked. */
  onClose: () => void;
  /** The current time index of the simulation playback, to get current satellite data. */
  currentTimeIndex: number;
  /** Optional initial position (e.g., mouse click coordinates) for the panel. Can be null. */
  initialPosition?: { x: number; y: number } | null;
  /** Indicates whether the connections panel is open. */
  isConnectionsPanelOpen?: boolean;
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
  currentTimeIndex,
  initialPosition,
  isConnectionsPanelOpen
}) => {
  const [panelPosition, setPanelPosition] = useState({ x: 50, y: 50 }); // Renamed for clarity
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 }); // Renamed for clarity
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [allowTextSelection, setAllowTextSelection] = useState(false); // For copy/paste mode

  const satelliteData = selectedSatelliteId === 'BEACON' 
    ? simulationResults.beaconTrack?.[currentTimeIndex]
    : simulationResults.iridiumTracks?.[selectedSatelliteId]?.[currentTimeIndex];

  const currentGeodeticPos: GeodeticPosition | undefined = satelliteData?.positionGeodetic;
  
  const allHandshakes = simulationResults.handshakeLog || [];
  const satelliteHandshakes = selectedSatelliteId === 'BEACON' 
    ? allHandshakes 
    : allHandshakes.filter(h => h.iridiumSatelliteId === selectedSatelliteId);

  // Determine if the selected Iridium satellite is actively connected at the current time index
  let isActiveLink = false;
  if (selectedSatelliteId !== 'BEACON' && simulationResults.activeLinksLog && simulationResults.activeLinksLog[currentTimeIndex]) {
    const activeConnectionsAtCurrentTime = simulationResults.activeLinksLog[currentTimeIndex];
    isActiveLink = activeConnectionsAtCurrentTime.has(selectedSatelliteId);
  }

  const handleMouseDownOnHeader = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!panelRef.current || allowTextSelection) return; // Don't drag if text selection is on
    
    setIsDragging(true);
    const panelRect = panelRef.current.getBoundingClientRect();
    setDragStartOffset({
      x: e.clientX - panelRect.left,
      y: e.clientY - panelRect.top,
    });
    e.preventDefault(); // Prevent text selection during drag initiation
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    let newX = e.clientX - dragStartOffset.x;
    let newY = e.clientY - dragStartOffset.y;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelCurrent = panelRef.current;
    const panelRect = panelCurrent.getBoundingClientRect();
    
    // Estimate header height - replace with dynamic measure if more accuracy is needed
    const headerElement = panelCurrent.querySelector(`.${styles.panelHeader}`) as HTMLElement;
    const headerHeight = headerElement ? headerElement.offsetHeight : 50; // Approx header height

    // Horizontal constraints (keep panel fully within horizontal viewport)
    newX = Math.max(0, Math.min(newX, vw - panelRect.width));

    // Vertical constraints:
    // Allow top of panel to go up to top of viewport (0)
    // Allow top of panel to go down such that at least the headerHeight is visible
    newY = Math.max(0, Math.min(newY, vh - headerHeight));

    setPanelPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartOffset]);

  // Effect for panel positioning
  useEffect(() => {
    let newXCalc: number, newYCalc: number;
    const panelCurrent = panelRef.current;
    const estimatedPanelWidth = panelCurrent?.offsetWidth || 350; 
    const estimatedPanelHeight = panelCurrent?.offsetHeight || 300;
    const viewportMargin = 20;
    const connectionsPanelAssumedWidth = 300; 
    const interPanelMargin = 15;

    if (isConnectionsPanelOpen) {
      newXCalc = connectionsPanelAssumedWidth + interPanelMargin;
      newYCalc = initialPosition?.y 
        ? initialPosition.y - estimatedPanelHeight / 2 
        : viewportMargin + 70; 
      newYCalc = Math.max(viewportMargin, newYCalc); 
    } else if (initialPosition) {
      newXCalc = initialPosition.x - estimatedPanelWidth - interPanelMargin;
      newYCalc = initialPosition.y - estimatedPanelHeight / 2;
      if (newXCalc < viewportMargin) {
        newXCalc = initialPosition.x + interPanelMargin + 15;
      }
    } else {
      newXCalc = viewportMargin + 50;
      newYCalc = viewportMargin + 50;
    }

    if (newXCalc + estimatedPanelWidth > window.innerWidth - viewportMargin) {
      newXCalc = window.innerWidth - estimatedPanelWidth - viewportMargin;
    }
    if (newYCalc + estimatedPanelHeight > window.innerHeight - viewportMargin) {
      newYCalc = window.innerHeight - estimatedPanelHeight - viewportMargin;
    }
    newXCalc = Math.max(viewportMargin, newXCalc);
    newYCalc = Math.max(viewportMargin, newYCalc);

    setPanelPosition({ x: newXCalc, y: newYCalc });
    //setIsMinimized(false); // Moved to its own effect
    //setAllowTextSelection(false); // Moved to its own effect
  }, [selectedSatelliteId, initialPosition, isConnectionsPanelOpen]);

  // Effect for resetting minimized and copy mode state when satellite changes
  useEffect(() => {
    setIsMinimized(false);
    setAllowTextSelection(false);
  }, [selectedSatelliteId]); // Only depends on selectedSatelliteId
  
  const toggleMinimize = () => setIsMinimized(!isMinimized);
  const toggleCopyMode = () => setAllowTextSelection(!allowTextSelection);

  if (!simulationResults.beaconTrack && !simulationResults.iridiumTracks) { // Basic check if results are empty
    // This might need a more robust check based on your data structure if tracks can be empty arrays
    return (
        <div ref={panelRef} className={styles.sidePanel} style={{left: `${panelPosition.x}px`, top: `${panelPosition.y}px`, position: 'fixed', zIndex: 1050}}>
            Loading details or no data available...
        </div>
    );
  }
  
  const panelClasses = `${styles.sidePanel} ${isMinimized ? styles.minimized : ''}`;

  return (
    <div 
      ref={panelRef} 
      className={panelClasses}
      style={{
        left: `${panelPosition.x}px`, 
        top: `${panelPosition.y}px`,
        position: 'fixed',
        cursor: isDragging ? 'grabbing' : (allowTextSelection ? 'text' : 'grab'),
        zIndex: 1050, 
        userSelect: allowTextSelection ? 'auto' : 'none'
      }}
    >
      <div className={styles.panelHeader} onMouseDown={handleMouseDownOnHeader}>
        <h4 className={styles.panelTitle}>Details: {selectedSatelliteId}</h4>
        <div className={styles.headerButtons}>
            <button 
              onClick={toggleCopyMode} 
              className={styles.headerButton} 
              title={allowTextSelection ? "Enable Panel Dragging" : "Enable Text Selection"}
            >
              {allowTextSelection ? '✋' : '✂️'} 
              <span className={styles.buttonText}>{allowTextSelection ? 'Drag' : 'Select'}</span>
            </button>
            <button 
              onClick={toggleMinimize} 
              className={styles.headerButton} 
              title={isMinimized ? "Maximize" : "Minimize"}
            >
                {isMinimized ? '□' : '−'}
            </button>
            <button 
              onClick={onClose} 
              className={`${styles.headerButton} ${styles.closeButtonCustom}`}
              title="Close Panel"
            >
              ×
            </button>
        </div>
      </div>
      {!isMinimized && (
        <div className={styles.panelContent}>
          {currentGeodeticPos ? (
            <div className={styles.section}>
              <h5 className={styles.sectionTitle}>Current Position (Geodetic):</h5>
              <ul className={styles.infoList}>
                <li><strong>Lat:</strong> {currentGeodeticPos.latitude.toFixed(3)}°</li>
                <li><strong>Lon:</strong> {currentGeodeticPos.longitude.toFixed(3)}°</li>
                <li><strong>Alt:</strong> {currentGeodeticPos.altitude.toFixed(2)} km</li>
              </ul>
            </div>
          ) : <p>Position data unavailable at current time step.</p>}

          {/* Display Active Link Status for Iridium Satellites */}
          {selectedSatelliteId !== 'BEACON' && (
            <div className={styles.section}>
              <h5 className={styles.sectionTitle}>Link Status:</h5>
              <p className={isActiveLink ? styles.activeLink : styles.inactiveLink}>
                {isActiveLink ? 'Actively connected to Beacon' : 'Not currently connected to Beacon'}
              </p>
            </div>
          )}

          <div className={styles.section}>
            <h5 className={styles.sectionTitle}>Handshakes ({satelliteHandshakes.length}):</h5>
            {satelliteHandshakes.length > 0 ? (
              <ul className={`${styles.infoList} ${styles.handshakeList}`}>
                {satelliteHandshakes.map((shake: Handshake, index: number) => (
                  <li key={index} className={styles.handshakeItem}>
                    <span><strong>Time:</strong> {new Date(shake.timestamp).toLocaleTimeString()}</span>
                    <span>
                        {selectedSatelliteId !== 'BEACON' && `With: Beacon`}
                        {selectedSatelliteId === 'BEACON' && `With: ${shake.iridiumSatelliteId}`}
                    </span>
                    <span>
                        {`@ Pos (Beacon): Lat ${shake.beaconPosition.latitude.toFixed(1)}, Lon ${shake.beaconPosition.longitude.toFixed(1)}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No handshakes recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SidePanel; 