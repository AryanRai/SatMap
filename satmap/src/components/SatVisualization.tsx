import React, { useState, useEffect, useRef } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    Graticule,
    Line,
    Marker,
    ZoomableGroup
} from 'react-simple-maps';
import { SimulationResults, SatellitePosition, Handshake, GeodeticPosition } from '../types/orbit';

// This URL points to a TopoJSON file from the official world-atlas repository
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const INITIAL_ZOOM = 1;
const INITIAL_MAP_POSITION: [number, number] = [0, 20];
const DEFAULT_TRAIL_SEGMENT_LENGTH = 10;
const ANIMATION_SPEED_MS = 200;

/**
 * Props for the SatVisualization component.
 */
interface SatVisualizationProps {
    /** The complete results of the satellite simulation, or null if no simulation has run. */
    results: SimulationResults | null;
    selectedSatelliteId: string | null;
    onSatelliteSelect: (id: string, clickCoords: { x: number; y: number }) => void;
    currentTimeIndex: number;
    setCurrentTimeIndex: (index: number | ((prevIndex: number) => number)) => void;
}

/** CSS for beacon pulsing effect */
const pulseKeyframes = `
  @keyframes pulseAnimation {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

/**
 * SatVisualization component.
 * Renders a 2D world map to visualize satellite orbits, handshakes, and active communication links.
 * Features playback controls (play, pause, slider, reset), map navigation (zoom, pan),
 * and options to toggle trails, links, labels, beacon pulse, and handshake markers.
 * It also integrates a SidePanel to display details of a selected satellite.
 */
const SatVisualization: React.FC<SatVisualizationProps> = ({ 
    results, 
    selectedSatelliteId, 
    onSatelliteSelect,
    currentTimeIndex,
    setCurrentTimeIndex
}) => {
    const { beaconTrack, iridiumTracks, activeLinksLog, handshakeLog } = results || {};

    const [hoveredSatellite, setHoveredSatellite] = useState<string | null>(null);
    const [hoveredSatPosition, setHoveredSatPosition] = useState<GeodeticPosition | null>(null);
    const [tooltipCoords, setTooltipCoords] = useState<{ x: number, y: number } | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);

    const [zoom, setZoom] = useState(INITIAL_ZOOM);
    const [position, setPosition] = useState<[number, number]>(INITIAL_MAP_POSITION);
    const [trailLength, setTrailLength] = useState<number>(DEFAULT_TRAIL_SEGMENT_LENGTH);
    const [showTrails, setShowTrails] = useState<boolean>(false);
    const [showActiveLinks, setShowActiveLinks] = useState<boolean>(true);
    const [showPersistentSatelliteNames, setShowPersistentSatelliteNames] = useState<boolean>(false);
    const [pulseBeacon, setPulseBeacon] = useState<boolean>(true);
    const [showHandshakeMarkers, setShowHandshakeMarkers] = useState<boolean>(true);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const hasSimulationData = !!(results && beaconTrack && beaconTrack.length > 0);
    const maxTimeIndex = hasSimulationData && beaconTrack ? beaconTrack.length - 1 : 0;

    useEffect(() => {
        setIsPlaying(false);
        setZoom(INITIAL_ZOOM);
        setPosition(INITIAL_MAP_POSITION);
        if (hasSimulationData) {
            setTrailLength(DEFAULT_TRAIL_SEGMENT_LENGTH);
            setShowTrails(true); 
            setShowActiveLinks(true);
            setShowPersistentSatelliteNames(false);
            setPulseBeacon(true);
            setShowHandshakeMarkers(true);
        } else {
            setShowTrails(false); 
            setPulseBeacon(false);
            setShowHandshakeMarkers(false);
        }
    }, [results, hasSimulationData]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isPlaying && hasSimulationData && maxTimeIndex > 0) {
            intervalId = setInterval(() => {
                setCurrentTimeIndex(prevIndex => {
                    const nextIndex = prevIndex + 1;
                    if (nextIndex > maxTimeIndex) {
                        setIsPlaying(false);
                        return maxTimeIndex;
                    }
                    return nextIndex;
                });
            }, ANIMATION_SPEED_MS);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isPlaying, hasSimulationData, maxTimeIndex, setCurrentTimeIndex]);

    const handlePlayPause = () => {
        if (!hasSimulationData) return;
        if (currentTimeIndex >= maxTimeIndex && !isPlaying) {
            setCurrentTimeIndex(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        if (!hasSimulationData) return;
        setIsPlaying(false);
        setCurrentTimeIndex(0);
        setZoom(INITIAL_ZOOM);
        setPosition(INITIAL_MAP_POSITION);
    };

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasSimulationData) return;
        setIsPlaying(false);
        setCurrentTimeIndex(Number(event.target.value));
    };

    const handleMarkerClick = (satelliteId: string, event: React.MouseEvent) => {
        if (!hasSimulationData) return;
        onSatelliteSelect(satelliteId, { x: event.clientX, y: event.clientY });
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 10));
    const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.5));
    const handleResetView = () => {
        setZoom(INITIAL_ZOOM);
        setPosition(INITIAL_MAP_POSITION);
    };

    const handleMoveEnd = (pos: { coordinates: [number, number], zoom: number }) => {
        setPosition(pos.coordinates);
        setZoom(pos.zoom);
    };

    const handleTrailLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newLength = parseInt(event.target.value, 10);
        if (!isNaN(newLength) && newLength >= 0) setTrailLength(newLength);
        else if (event.target.value === '') setTrailLength(0);
    };

    const handleShowTrailsToggle = (event: React.ChangeEvent<HTMLInputElement>) => setShowTrails(event.target.checked);
    const handleShowActiveLinksToggle = (event: React.ChangeEvent<HTMLInputElement>) => setShowActiveLinks(event.target.checked);
    const handleShowPersistentSatelliteNamesToggle = (event: React.ChangeEvent<HTMLInputElement>) => setShowPersistentSatelliteNames(event.target.checked);
    const handlePulseBeaconToggle = (event: React.ChangeEvent<HTMLInputElement>) => setPulseBeacon(event.target.checked);
    const handleShowHandshakeMarkersToggle = (event: React.ChangeEvent<HTMLInputElement>) => setShowHandshakeMarkers(event.target.checked);

    const currentTimestamp = hasSimulationData && beaconTrack ? beaconTrack[currentTimeIndex]?.timestamp : null;
    const currentActiveIridiumIds = hasSimulationData && activeLinksLog ? (activeLinksLog[currentTimeIndex] || new Set<string>()) : new Set<string>();
    const currentBeaconPosition = hasSimulationData && beaconTrack ? beaconTrack[currentTimeIndex]?.positionGeodetic : null;
    
    const allTracks = hasSimulationData && beaconTrack && iridiumTracks ? {
        BEACON: beaconTrack,
        ...iridiumTracks
    } : {};

    const getTrackColor = (satelliteId: string, isActiveLink: boolean) => {
        if (satelliteId === 'BEACON') return '#ff4500'; // Martian Orange for Beacon trail
        if (satelliteId.startsWith('IRIDIUM')) return isActiveLink ? '#00dd00' : '#50fa7b'; // Brighter green for active, slightly less bright for inactive Iridium
        return '#aaa';
    };

    const getMarkerColor = (satelliteId: string, isActiveLink: boolean) => {
        if (satelliteId === 'BEACON') return '#ff4500'; // Martian Orange for Beacon marker
        return isActiveLink ? '#33ff33' : '#61dafb'; // Existing Iridium colors
    };
    
    const handleSatelliteHover = (satelliteId: string | null, satPosition: GeodeticPosition | null, event?: React.MouseEvent) => {
        if (!hasSimulationData && satelliteId) return;
        setHoveredSatellite(satelliteId);
        setHoveredSatPosition(satPosition);
        if (satelliteId && event && mapContainerRef.current) {
            const rect = mapContainerRef.current.getBoundingClientRect();
            setTooltipCoords({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        } else {
            setTooltipCoords(null);
        }
    };

    const isHtmlElement = (target: EventTarget | null): target is HTMLElement => target instanceof HTMLElement;

    return (
        <div ref={mapContainerRef} className="sat-visualization-container" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', border: '1px solid #444', background: '#2c2c2c', borderRadius: '12px', padding: '15px', position: 'relative' }}>
            <style>{pulseKeyframes}</style> {/* Inject keyframes */} 
            {hasSimulationData && (
                <div 
                    className="controls playback-controls" 
                    style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', color: '#eee' }}
                    onMouseDownCapture={(e) => e.stopPropagation()} 
                    onTouchStartCapture={(e) => e.stopPropagation()} 
                >
                    <button onClick={handlePlayPause} disabled={!hasSimulationData} style={{ padding: '8px 12px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: hasSimulationData ? 'pointer' : 'default' }}>
                        {isPlaying ? 'Pause' : (currentTimeIndex >= maxTimeIndex ? 'Restart' : 'Play')}
                    </button>
                    <button onClick={handleReset} disabled={!hasSimulationData} style={{ padding: '8px 12px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: hasSimulationData ? 'pointer' : 'default' }}>
                        Reset
                    </button>
                    <input
                        type="range"
                        min="0"
                        max={maxTimeIndex}
                        value={currentTimeIndex}
                        onChange={handleSliderChange}
                        disabled={!hasSimulationData}
                        style={{ flexGrow: 1, cursor: hasSimulationData ? 'pointer' : 'default' }}
                        title={hasSimulationData ? `Time step: ${currentTimeIndex + 1}` : "Simulation data needed"}
                    />
                    <span className="timestamp-display" style={{ minWidth: '180px', textAlign: 'right' }}>
                        {currentTimestamp ? new Date(currentTimestamp).toLocaleString() : (hasSimulationData ? 'Time N/A' : '-')}
                    </span>
                </div>
            )}

            <div 
                className="controls map-controls" 
                style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}
                onMouseDownCapture={(e) => e.stopPropagation()} 
                onTouchStartCapture={(e) => e.stopPropagation()} 
            >
                <button onClick={handleZoomIn} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom In (+)</button>
                <button onClick={handleZoomOut} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom Out (-)</button>
                <button onClick={handleResetView} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reset View</button>
                {hasSimulationData && (
                    <span className="step-display" style={{marginLeft: 'auto', fontSize: '0.9em' }}>Step: {currentTimeIndex + 1} / {maxTimeIndex + 1}</span>
                )}
            </div>

            {hasSimulationData && (
                <div 
                    className="controls visualization-options-controls" 
                    style={{ marginBottom: '15px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', color: '#eee'}}
                    onMouseDownCapture={(e) => e.stopPropagation()} 
                    onTouchStartCapture={(e) => e.stopPropagation()} 
                >
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input type="checkbox" id="showTrailsToggle" checked={showTrails} onChange={handleShowTrailsToggle} disabled={!hasSimulationData} style={{cursor: hasSimulationData ? 'pointer' : 'default'}}/>
                        <label htmlFor="showTrailsToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Trails</label>
                        <input type="number" id="trailLengthInput" title="Number of trail segments" value={trailLength} onChange={handleTrailLengthChange} min="0" disabled={!hasSimulationData || !showTrails} className="trail-length-input" style={{width: '60px', padding: '4px', background: '#444', color: '#eee', border: '1px solid #666', borderRadius: '3px', marginLeft:'5px'}}/>
                        <label htmlFor="trailLengthInput" className="input-label" style={{fontSize: '0.9em'}}>(Length)</label>
                    </div>
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input type="checkbox" id="showActiveLinksToggle" checked={showActiveLinks} onChange={handleShowActiveLinksToggle} disabled={!hasSimulationData} style={{cursor: hasSimulationData ? 'pointer' : 'default'}}/>
                        <label htmlFor="showActiveLinksToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Active Links</label>
                    </div>
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input type="checkbox" id="showPersistentSatelliteNamesToggle" checked={showPersistentSatelliteNames} onChange={handleShowPersistentSatelliteNamesToggle} disabled={!hasSimulationData} style={{cursor: hasSimulationData ? 'pointer' : 'default'}}/>
                        <label htmlFor="showPersistentSatelliteNamesToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Satellite Names</label>
                    </div>
                     <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input type="checkbox" id="pulseBeaconToggle" checked={pulseBeacon} onChange={handlePulseBeaconToggle} disabled={!hasSimulationData} style={{cursor: hasSimulationData ? 'pointer' : 'default'}}/>
                        <label htmlFor="pulseBeaconToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Pulse Beacon</label>
                    </div>
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input type="checkbox" id="showHandshakeMarkersToggle" checked={showHandshakeMarkers} onChange={handleShowHandshakeMarkersToggle} disabled={!hasSimulationData} style={{cursor: hasSimulationData ? 'pointer' : 'default'}}/>
                        <label htmlFor="showHandshakeMarkersToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Handshake Markers</label>
                    </div>
                </div>
            )}

            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 120 }} className="composable-map-element" style={{ width: '100%', height: 'auto' }}>
                <ZoomableGroup zoom={zoom} center={position} onMoveEnd={handleMoveEnd} minZoom={0.5} maxZoom={10}>
                    <Graticule stroke="rgba(255, 165, 0, 0.08)" step={[15,15]} />
                    <Geographies geography={geoUrl}>
                        {({ geographies }) => geographies.map(geo => (
                            <Geography key={geo.rsmKey} geography={geo} fill="#403830" stroke="#5A4D40" style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}/>
                        ))}
                    </Geographies>

                    {hasSimulationData && beaconTrack && iridiumTracks && activeLinksLog && (
                        <>
                            {showTrails && Object.entries(allTracks).map(([satelliteId, track]) => {
                                if (!Array.isArray(track) || track.length === 0) return null;
                                const currentSatPosData = track[currentTimeIndex];
                                if (!currentSatPosData) return null;
                                const isActive = satelliteId === 'BEACON' || currentActiveIridiumIds.has(satelliteId);
                                const trailColorToUse = getTrackColor(satelliteId, isActive);
                                const trailStartIndex = Math.max(0, currentTimeIndex - trailLength + 1);
                                const trailData = track.slice(trailStartIndex, currentTimeIndex + 1).map((p: SatellitePosition) => [p.positionGeodetic.longitude, p.positionGeodetic.latitude] as [number, number]);
                                if (trailData.length < 2) return null;
                                return <Line key={`${satelliteId}-trail`} coordinates={trailData} stroke={trailColorToUse} strokeWidth={satelliteId === 'BEACON' ? 2 : 1.5} strokeOpacity={0.6} />;
                            })}

                            {showActiveLinks && currentBeaconPosition && Array.from(currentActiveIridiumIds).map(iridiumId => {
                                const iridiumSatDataArray = iridiumTracks[iridiumId];
                                if (!Array.isArray(iridiumSatDataArray) || iridiumSatDataArray.length <= currentTimeIndex) return null;
                                const iridiumSatCurrent = iridiumSatDataArray[currentTimeIndex];
                                if (!iridiumSatCurrent) return null;
                                return <Line key={`link-beacon-${iridiumId}`} from={[currentBeaconPosition.longitude, currentBeaconPosition.latitude]} to={[iridiumSatCurrent.positionGeodetic.longitude, iridiumSatCurrent.positionGeodetic.latitude]} stroke="#00ff00" strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.7} />;
                            })}

                            {Object.entries(allTracks).map(([satelliteId, track]) => {
                                if (!Array.isArray(track) || track.length === 0) return null;
                                const currentSatPos = track[currentTimeIndex];
                                if (!currentSatPos) return null;
                                const isActiveLink = satelliteId !== 'BEACON' && currentActiveIridiumIds.has(satelliteId);
                                const markerColorToUse = getMarkerColor(satelliteId, isActiveLink);
                                const beaconMarkerStyle = satelliteId === 'BEACON' && pulseBeacon ? { animation: 'pulseAnimation 1.5s infinite ease-in-out' } : {};

                                return (
                                    <Marker key={`${satelliteId}-marker`} coordinates={[currentSatPos.positionGeodetic.longitude, currentSatPos.positionGeodetic.latitude]} onMouseEnter={(e) => handleSatelliteHover(satelliteId, currentSatPos.positionGeodetic, e)} onMouseLeave={() => handleSatelliteHover(null, null)} onClick={(e) => handleMarkerClick(satelliteId, e)}>
                                        <circle r={satelliteId === 'BEACON' ? 5 : 4} fill={markerColorToUse} stroke={isActiveLink ? "#fff" : "#333"} strokeWidth={isActiveLink ? 1 : 0.5} style={{ cursor: 'pointer', ...beaconMarkerStyle }} />
                                        {showPersistentSatelliteNames && (
                                            <text textAnchor="middle" y={-8} style={{ fill: 'white', fontSize: '10px', pointerEvents: 'none' }}>
                                                {satelliteId.replace('IRIDIUM ', 'I-')}
                                            </text>
                                        )}
                                    </Marker>
                                );
                            })}

                            {showHandshakeMarkers && handshakeLog && currentTimestamp !== null && handshakeLog.map((handshake, index) => {
                                if (handshake.timestamp <= currentTimestamp) {
                                    return (
                                        <Marker key={`handshake-${index}`} coordinates={[handshake.beaconPosition.longitude, handshake.beaconPosition.latitude]}>
                                            <circle r={2.5} fill="#ffd700" opacity={0.6} stroke="#fff" strokeWidth={0.3} pointerEvents="none" /> 
                                        </Marker>
                                    );
                                }
                                return null;
                            })}
                        </>
                    )}
                </ZoomableGroup>
            </ComposableMap>
            
            {hoveredSatellite && hoveredSatPosition && tooltipCoords && (
                <div style={{
                    position: 'absolute',
                    left: `${tooltipCoords.x + 15}px`,
                    top: `${tooltipCoords.y + 15}px`,
                    background: 'rgba(40, 40, 40, 0.9)',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    border: '1px solid #555'
                }}>
                    <div><strong>ID:</strong> {hoveredSatellite}</div>
                    <div><strong>Lat:</strong> {hoveredSatPosition.latitude.toFixed(3)}°</div>
                    <div><strong>Lon:</strong> {hoveredSatPosition.longitude.toFixed(3)}°</div>
                    <div><strong>Alt:</strong> {hoveredSatPosition.altitude.toFixed(2)} km</div>
                </div>
            )}
        </div>
    );
};

export default SatVisualization; 