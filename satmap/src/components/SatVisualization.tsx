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
import SidePanel from './SidePanel';

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
}

/**
 * SatVisualization component.
 * Renders a 2D world map to visualize satellite orbits, handshakes, and active communication links.
 * Features playback controls (play, pause, slider, reset), map navigation (zoom, pan),
 * and options to toggle trails, links, and labels.
 * It also integrates a SidePanel to display details of a selected satellite.
 */
const SatVisualization: React.FC<SatVisualizationProps> = ({ results }) => {
    // Destructure with default {} if results is null, to prevent errors on initial load
    const { beaconTrack, iridiumTracks, activeLinksLog, handshakeLog } = results || {};

    const [hoveredSatellite, setHoveredSatellite] = useState<string | null>(null);
    const [hoveredSatPosition, setHoveredSatPosition] = useState<GeodeticPosition | null>(null);
    const [tooltipCoords, setTooltipCoords] = useState<{ x: number, y: number } | null>(null);

    const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);

    const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [zoom, setZoom] = useState(INITIAL_ZOOM);
    const [position, setPosition] = useState<[number, number]>(INITIAL_MAP_POSITION);
    const [trailLength, setTrailLength] = useState<number>(DEFAULT_TRAIL_SEGMENT_LENGTH);
    const [showTrails, setShowTrails] = useState<boolean>(false);
    const [showActiveLinks, setShowActiveLinks] = useState<boolean>(true);
    const [showPersistentSatelliteNames, setShowPersistentSatelliteNames] = useState<boolean>(false);

    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Determine if there is valid simulation data to display
    const hasSimulationData = !!(results && beaconTrack && beaconTrack.length > 0);
    const maxTimeIndex = hasSimulationData && beaconTrack ? beaconTrack.length - 1 : 0;

    useEffect(() => {
        // Reset state when new results come in or results are cleared
        setCurrentTimeIndex(0);
        setIsPlaying(false);
        setZoom(INITIAL_ZOOM);
        setPosition(INITIAL_MAP_POSITION);
        setSelectedSatelliteId(null);
        // Only reset visual options if new data is loaded, not if it's cleared
        if (hasSimulationData) {
            setTrailLength(DEFAULT_TRAIL_SEGMENT_LENGTH);
            setShowTrails(true); // Default to showing trails if data exists
            setShowActiveLinks(true);
            setShowPersistentSatelliteNames(false);
        } else {
            setShowTrails(false); // Ensure trails are off if no data
        }
    }, [results, hasSimulationData]); // Depend on results and the derived hasSimulationData

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
    }, [isPlaying, hasSimulationData, maxTimeIndex]);

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
        setSelectedSatelliteId(null);
    };

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasSimulationData) return;
        setIsPlaying(false);
        setCurrentTimeIndex(Number(event.target.value));
    };

    const handleMarkerClick = (satelliteId: string) => {
        if (!hasSimulationData) return;
        setSelectedSatelliteId(satelliteId);
    };

    const closeSidePanel = () => {
        setSelectedSatelliteId(null);
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
        if (!isNaN(newLength) && newLength >= 0) {
            setTrailLength(newLength);
        } else if (event.target.value === '') {
            setTrailLength(0);
        }
    };

    const handleShowTrailsToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setShowTrails(event.target.checked);
    };

    const handleShowActiveLinksToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setShowActiveLinks(event.target.checked);
    };

    const handleShowPersistentSatelliteNamesToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setShowPersistentSatelliteNames(event.target.checked);
    };

    // Data for the current time step, only if data exists
    const currentTimestamp = hasSimulationData && beaconTrack ? beaconTrack[currentTimeIndex]?.timestamp : null;
    const currentActiveIridiumIds = hasSimulationData && activeLinksLog ? (activeLinksLog[currentTimeIndex] || new Set<string>()) : new Set<string>();
    const currentBeaconPosition = hasSimulationData && beaconTrack ? beaconTrack[currentTimeIndex]?.positionGeodetic : null;
    
    const allTracks = hasSimulationData && beaconTrack && iridiumTracks ? {
        BEACON: beaconTrack,
        ...iridiumTracks
    } : {}; // Empty object if no data

    const getTrackColor = (satelliteId: string, isActiveLink: boolean) => {
        if (satelliteId === 'BEACON') return '#ff4500';
        if (satelliteId.startsWith('IRIDIUM')) {
             return isActiveLink ? '#00ff00' : '#61dafb';
        }
        return '#aaa';
    };

    const getMarkerColor = (satelliteId: string, isActiveLink: boolean) => {
        if (satelliteId === 'BEACON') return '#ff4500';
        return isActiveLink ? '#33ff33' : '#61dafb';
    };
    
    // Tooltip handler
    const handleSatelliteHover = (satelliteId: string | null, satPosition: GeodeticPosition | null, event?: React.MouseEvent) => {
        if (!hasSimulationData && satelliteId) return; // Don't show tooltips if no data for satellites
        setHoveredSatellite(satelliteId);
        setHoveredSatPosition(satPosition);
        if (satelliteId && event && mapContainerRef.current) {
            const rect = mapContainerRef.current.getBoundingClientRect();
            setTooltipCoords({ 
                x: event.clientX - rect.left,
                y: event.clientY - rect.top 
            });
        } else {
            setTooltipCoords(null);
        }
    };

    // Type guard for filterZoomEvent
    const isHtmlElement = (target: EventTarget | null): target is HTMLElement => {
        return target instanceof HTMLElement;
    };

    return (
        <div ref={mapContainerRef} className="sat-visualization-container" style={{ width: '100%', maxWidth: '900px', margin: '20px auto', border: '1px solid #444', background: '#2c2c2c', borderRadius: '12px', padding: '15px', position: 'relative' }}>
            {/* Playback Controls: Conditionally render or disable based on hasSimulationData */} 
            {hasSimulationData && (
                <div 
                    className="controls playback-controls" 
                    style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', color: '#eee' }}
                    onMouseDownCapture={(e) => e.stopPropagation()} // Stop propagation for mouse events
                    onTouchStartCapture={(e) => e.stopPropagation()} // Stop propagation for touch events
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

            {/* Map Navigation Controls: Always visible, affect the map view itself */} 
            <div 
                className="controls map-controls" 
                style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}
                onMouseDownCapture={(e) => e.stopPropagation()} // Stop propagation for mouse events
                onTouchStartCapture={(e) => e.stopPropagation()} // Stop propagation for touch events
            >
                <button onClick={handleZoomIn} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom In (+)</button>
                <button onClick={handleZoomOut} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom Out (-)</button>
                <button onClick={handleResetView} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reset View</button>
                {hasSimulationData && (
                    <span className="step-display" style={{marginLeft: 'auto', fontSize: '0.9em' }}>Step: {currentTimeIndex + 1} / {maxTimeIndex + 1}</span>
                )}
            </div>

            {/* Visualization Options: Conditionally render or disable based on hasSimulationData */} 
            {hasSimulationData && (
                <div 
                    className="controls visualization-options-controls" 
                    style={{ marginBottom: '15px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', color: '#eee'}}
                    onMouseDownCapture={(e) => e.stopPropagation()} // Stop propagation for mouse events
                    onTouchStartCapture={(e) => e.stopPropagation()} // Stop propagation for touch events
                >
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input 
                            type="checkbox" 
                            id="showTrailsToggle"
                            checked={showTrails}
                            onChange={handleShowTrailsToggle}
                            disabled={!hasSimulationData}
                            style={{cursor: hasSimulationData ? 'pointer' : 'default'}}
                        />
                        <label htmlFor="showTrailsToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Trails</label>
                        <input 
                            type="number" 
                            id="trailLengthInput" 
                            title="Number of trail segments"
                            value={trailLength}
                            onChange={handleTrailLengthChange}
                            min="0"
                            disabled={!hasSimulationData || !showTrails}
                            className="trail-length-input"
                            style={{width: '60px', padding: '4px', background: '#444', color: '#eee', border: '1px solid #666', borderRadius: '3px', marginLeft:'5px'}}
                        />
                        <label htmlFor="trailLengthInput" className="input-label" style={{fontSize: '0.9em'}}>(Length)</label>
                    </div>
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input 
                            type="checkbox" 
                            id="showActiveLinksToggle"
                            checked={showActiveLinks}
                            onChange={handleShowActiveLinksToggle}
                            disabled={!hasSimulationData}
                            style={{cursor: hasSimulationData ? 'pointer' : 'default'}}
                        />
                        <label htmlFor="showActiveLinksToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Active Links</label>
                    </div>
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input 
                            type="checkbox" 
                            id="showPersistentSatelliteNamesToggle"
                            checked={showPersistentSatelliteNames}
                            onChange={handleShowPersistentSatelliteNamesToggle}
                            disabled={!hasSimulationData}
                            style={{cursor: hasSimulationData ? 'pointer' : 'default'}}
                        />
                        <label htmlFor="showPersistentSatelliteNamesToggle" style={{fontSize: '0.9em', cursor: hasSimulationData ? 'pointer' : 'default'}}>Show Satellite Names</label>
                    </div>
                </div>
            )}

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 120,
                }}
                className="composable-map-element" 
                style={{ width: '100%', height: 'auto' }}
            >
                <ZoomableGroup 
                    zoom={zoom} 
                    center={position} 
                    onMoveEnd={handleMoveEnd}
                    minZoom={0.5}
                    maxZoom={10}
                >
                    <Graticule stroke="rgba(255, 165, 0, 0.08)" step={[15,15]} />
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map(geo => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill="#403830"      
                                    stroke="#5A4D40"    
                                    style={{
                                        default: { outline: 'none' },
                                        hover: { outline: 'none' }, 
                                        pressed: { outline: 'none' },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {/* Render Satellite Trails, Links, Markers only if hasSimulationData */} 
                    {hasSimulationData && beaconTrack && iridiumTracks && activeLinksLog && (
                        <>
                            {/* Render Satellite Trails */}
                            {showTrails && Object.entries(allTracks).map(([satelliteId, track]) => {
                                if (!Array.isArray(track) || track.length === 0) return null;
                                const currentSatPosData = track[currentTimeIndex];
                                if (!currentSatPosData) return null;

                                const isActive = satelliteId === 'BEACON' || currentActiveIridiumIds.has(satelliteId);
                                const trailColorToUse = getTrackColor(satelliteId, isActive);
                                
                                const trailStartIndex = Math.max(0, currentTimeIndex - trailLength + 1);
                                const trailData = track.slice(trailStartIndex, currentTimeIndex + 1)
                                                    .map((p: SatellitePosition) => [p.positionGeodetic.longitude, p.positionGeodetic.latitude] as [number, number]);
                                
                                if (trailData.length < 2) return null;

                                return (
                                    <Line
                                        key={`${satelliteId}-trail`}
                                        coordinates={trailData}
                                        stroke={trailColorToUse}
                                        strokeWidth={satelliteId === 'BEACON' ? 2 : 1.5}
                                        strokeOpacity={0.6}
                                    />
                                );
                            })}

                            {/* Render Active Communication Links */}
                            {showActiveLinks && currentBeaconPosition && Array.from(currentActiveIridiumIds).map(iridiumId => {
                                const iridiumSatDataArray = iridiumTracks[iridiumId]; // iridiumTracks is known to be defined here
                                if (!Array.isArray(iridiumSatDataArray) || iridiumSatDataArray.length <= currentTimeIndex) return null;
                                const iridiumSatCurrent = iridiumSatDataArray[currentTimeIndex];
                                if (!iridiumSatCurrent) return null;
                                return (
                                    <Line
                                        key={`link-beacon-${iridiumId}`}
                                        from={[currentBeaconPosition.longitude, currentBeaconPosition.latitude]}
                                        to={[iridiumSatCurrent.positionGeodetic.longitude, iridiumSatCurrent.positionGeodetic.latitude]}
                                        stroke="#00ff00"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 2"
                                        strokeOpacity={0.7}
                                    />
                                );
                            })}

                            {/* Render Satellite Markers */}
                            {Object.entries(allTracks).map(([satelliteId, track]) => {
                                if (!Array.isArray(track) || track.length === 0) return null;
                                const currentSatPos = track[currentTimeIndex];
                                if (!currentSatPos) return null;

                                const isActiveLink = satelliteId !== 'BEACON' && currentActiveIridiumIds.has(satelliteId);
                                const markerColorToUse = getMarkerColor(satelliteId, isActiveLink);

                                return (
                                    <Marker
                                        key={`${satelliteId}-marker`}
                                        coordinates={[currentSatPos.positionGeodetic.longitude, currentSatPos.positionGeodetic.latitude]}
                                        onMouseEnter={(e) => handleSatelliteHover(satelliteId, currentSatPos.positionGeodetic, e)}
                                        onMouseLeave={() => handleSatelliteHover(null, null)}
                                        onClick={() => handleMarkerClick(satelliteId)}
                                    >
                                        <circle r={satelliteId === 'BEACON' ? 5 : 4} fill={markerColorToUse} stroke={isActiveLink ? "#fff" : "#333"} strokeWidth={isActiveLink ? 1 : 0.5} style={{ cursor: 'pointer' }} />
                                        {showPersistentSatelliteNames && (
                                            <text
                                                textAnchor="middle"
                                                y={-8}
                                                style={{ fill: 'white', fontSize: '10px', pointerEvents: 'none' }}
                                            >
                                                {satelliteId.replace('IRIDIUM ', 'I-')}
                                            </text>
                                        )}
                                    </Marker>
                                );
                            })}

                            {/* Render Handshake Event Markers */}
                            {handshakeLog && currentTimestamp !== null && handshakeLog.map((handshake, index) => {
                                if (handshake.timestamp <= currentTimestamp) {
                                    return (
                                        <Marker
                                            key={`handshake-${index}`}
                                            coordinates={[handshake.beaconPosition.longitude, handshake.beaconPosition.latitude]}
                                        >
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
            
            {/* Tooltip for Hovered Satellite - only if data and hover active */} 
            {hasSimulationData && hoveredSatellite && hoveredSatPosition && tooltipCoords && (
                <div 
                    className="tooltip"
                    style={{
                        position: 'absolute',
                        left: `${tooltipCoords.x + 15}px`,
                        top: `${tooltipCoords.y + 15}px`,
                        background: 'rgba(0,0,0,0.75)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        transform: 'translateY(-100%)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <strong>{hoveredSatellite}</strong><br />
                    Lat: {hoveredSatPosition.latitude.toFixed(2)}&deg;, Lon: {hoveredSatPosition.longitude.toFixed(2)}&deg;<br />
                    Alt: {hoveredSatPosition.altitude.toFixed(2)} km
                </div>
            )}

            {/* Side Panel for Selected Satellite Details - only if data and selection active */} 
            {hasSimulationData && selectedSatelliteId && results && (
                <SidePanel 
                    selectedSatelliteId={selectedSatelliteId} 
                    simulationResults={results} 
                    onClose={closeSidePanel} 
                    currentTimeIndex={currentTimeIndex}
                />
            )}
        </div>
    );
};

export default SatVisualization; 