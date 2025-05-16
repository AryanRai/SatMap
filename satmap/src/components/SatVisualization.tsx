import React, { useState, useEffect, useCallback } from 'react';
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

interface SatVisualizationProps {
    results: SimulationResults;
}

const initialZoom = 1;
const initialPosition: [number, number] = [0, 20];
const DEFAULT_TRAIL_SEGMENT_LENGTH = 50;

const SatVisualization: React.FC<SatVisualizationProps> = ({ results }) => {
    const { beaconTrack, iridiumTracks, activeLinksLog } = results;
    const [hoveredSatellite, setHoveredSatellite] = useState<string | null>(null);
    const [hoveredSatPosition, setHoveredSatPosition] = useState<GeodeticPosition | null>(null); // For tooltip
    const [tooltipCoords, setTooltipCoords] = useState<{ x: number, y: number } | null>(null); // For tooltip screen position

    const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);

    const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const animationSpeed = 200; // milliseconds per step

    const [zoom, setZoom] = useState(initialZoom);
    const [position, setPosition] = useState<[number, number]>(initialPosition);
    const [trailLength, setTrailLength] = useState<number>(DEFAULT_TRAIL_SEGMENT_LENGTH);
    const [showTrails, setShowTrails] = useState<boolean>(true);

    // Determine the max length of tracks for the slider
    const maxTimeIndex = beaconTrack && beaconTrack.length > 0 ? beaconTrack.length - 1 : 0;

    useEffect(() => {
        setCurrentTimeIndex(0);
        setIsPlaying(false);
        setZoom(initialZoom);
        setPosition(initialPosition);
        setTrailLength(DEFAULT_TRAIL_SEGMENT_LENGTH);
        setShowTrails(true);
    }, [results]); // Reset animation when results change

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isPlaying && maxTimeIndex > 0) {
            intervalId = setInterval(() => {
                setCurrentTimeIndex(prevIndex => {
                    const nextIndex = prevIndex + 1;
                    if (nextIndex > maxTimeIndex) {
                        setIsPlaying(false); // Stop at the end
                        return maxTimeIndex;
                    }
                    return nextIndex;
                });
            }, animationSpeed);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isPlaying, maxTimeIndex, animationSpeed]);

    const handlePlayPause = () => {
        if (currentTimeIndex >= maxTimeIndex && !isPlaying) { // If at end and paused, restart
            setCurrentTimeIndex(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentTimeIndex(0);
        setZoom(initialZoom);
        setPosition(initialPosition);
    };

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsPlaying(false); // Pause when scrubbing
        setCurrentTimeIndex(Number(event.target.value));
    };

    const handleMarkerClick = (satelliteId: string) => {
        if (satelliteId.startsWith('IRIDIUM')) {
            setSelectedSatelliteId(satelliteId);
        } else {
            // setSelectedSatelliteId(null); // Keep panel open even if beacon is clicked, or other non-iridium
        }
    };

    const closeSidePanel = () => {
        setSelectedSatelliteId(null);
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 10));
    const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.5));
    const handleResetView = () => {
        setZoom(initialZoom);
        setPosition(initialPosition);
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
            setTrailLength(0); // Treat empty as 0
        }
    };

    const handleShowTrailsToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setShowTrails(event.target.checked);
    };

    if (!beaconTrack || !iridiumTracks) {
        return <p>Waiting for satellite track data...</p>;
    }

    const allTracks: { [id: string]: SatellitePosition[] } = {
        BEACON: beaconTrack,
        ...iridiumTracks
    };

    const getTrackColor = (satelliteId: string, isActiveLink: boolean) => {
        if (satelliteId === 'BEACON') return '#ff4500'; // Beacon orange
        if (satelliteId.startsWith('IRIDIUM')) {
             return isActiveLink ? '#00ff00' : '#61dafb'; // Green if active, else default Iridium blue/cyan
        }
        return '#aaa';
    };

    const getMarkerColor = (satelliteId: string, isActiveLink: boolean) => {
        if (satelliteId === 'BEACON') return '#ff4500';
        return isActiveLink ? '#33ff33' : '#61dafb'; // Brighter Green for active marker
    };
    
    const currentTimestamp = beaconTrack && beaconTrack.length > currentTimeIndex ? beaconTrack[currentTimeIndex]?.timestamp : null;
    const currentActiveIridiumIds = activeLinksLog && activeLinksLog.length > currentTimeIndex ? activeLinksLog[currentTimeIndex] : new Set<string>();

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '20px auto', border: '1px solid #444', background: '#2c2c2c', borderRadius: '12px', padding: '15px', position: 'relative' }}>
            <div className="controls" style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', color: '#eee' }}>
                <button onClick={handlePlayPause} style={{ padding: '8px 12px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {isPlaying ? 'Pause' : (currentTimeIndex >= maxTimeIndex ? 'Restart' : 'Play')}
                </button>
                <button onClick={handleReset} style={{ padding: '8px 12px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Reset
                </button>
                <input
                    type="range"
                    min="0"
                    max={maxTimeIndex}
                    value={currentTimeIndex}
                    onChange={handleSliderChange}
                    style={{ flexGrow: 1, cursor: 'pointer' }}
                />
                <span style={{ minWidth: '180px', textAlign: 'right' }}>
                     {currentTimestamp ? new Date(currentTimestamp).toLocaleString() : 'Time N/A'}
                </span>
            </div>
            <div className="map-controls" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <button onClick={handleZoomIn} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom In (+)</button>
                <button onClick={handleZoomOut} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom Out (-)</button>
                <button onClick={handleResetView} style={{ padding: '5px 10px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reset View</button>
                <span style={{marginLeft: 'auto', fontSize: '0.9em' }}>Step: {currentTimeIndex + 1} / {maxTimeIndex + 1}</span>
            </div>
            <div className="trail-controls" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#eee'}}>
                <label htmlFor="trailLengthInput" style={{fontSize: '0.9em'}}>Trail Length:</label>
                <input 
                    type="number" 
                    id="trailLengthInput" 
                    value={trailLength}
                    onChange={handleTrailLengthChange}
                    min="0"
                    disabled={!showTrails}
                    style={{width: '60px', padding: '4px', background: '#444', color: '#eee', border: '1px solid #666', borderRadius: '3px'}}
                />
                <input 
                    type="checkbox" 
                    id="showTrailsToggle"
                    checked={showTrails}
                    onChange={handleShowTrailsToggle}
                    style={{cursor: 'pointer'}}
                />
                <label htmlFor="showTrailsToggle" style={{fontSize: '0.9em', cursor: 'pointer'}}>Show Trails</label>
            </div>
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 120, 
                }}
                style={{ width: '100%', height: 'auto' }}
            >
                <ZoomableGroup 
                    center={position} 
                    zoom={zoom} 
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

                    {Object.entries(allTracks).map(([id, track]) => {
                        if (track.length < 1) return null; // Need at least one point for the marker
                        const isActive = currentActiveIridiumIds.has(id);
                        
                        const trailStartIndex = Math.max(0, currentTimeIndex - (showTrails ? trailLength : 0) + 1);
                        const trailSegmentForLine = track.slice(trailStartIndex, currentTimeIndex + 1);

                        let trailCoordinates: [number, number][] = [];
                        if (showTrails && trailSegmentForLine.length >= 2 && trailLength > 0) {
                            trailCoordinates = trailSegmentForLine.map(p => [p.positionGeodetic.longitude, p.positionGeodetic.latitude] as [number, number]);
                        }

                        return (
                            <React.Fragment key={`frag-${id}`}>
                                {trailCoordinates.length >= 2 && (
                                    <Line
                                        key={`track-segment-${id}`}
                                        coordinates={trailCoordinates}
                                        stroke={getTrackColor(id, isActive)}
                                        strokeWidth={id === 'BEACON' ? 2 : (isActive ? 2.5 : 1.5)}
                                        strokeOpacity={isActive ? 0.9 : 0.7}
                                    />
                                )}
                                {/* Marker is always drawn based on currentTimeIndex, even if trail is short */}
                                {track.length > currentTimeIndex && (() => {
                                    const currentPositionData = track[currentTimeIndex];
                                    if (!currentPositionData) return null;
                                    const { longitude, latitude } = currentPositionData.positionGeodetic;
                                    return (
                                        <Marker
                                            key={`marker-${id}`}
                                            coordinates={[longitude, latitude]}
                                        >
                                            <g 
                                                onMouseEnter={(event) => {
                                                    setHoveredSatellite(id);
                                                    setHoveredSatPosition(currentPositionData.positionGeodetic);
                                                    setTooltipCoords({ x: event.clientX, y: event.clientY });
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredSatellite(null);
                                                    setHoveredSatPosition(null);
                                                    setTooltipCoords(null);
                                                }}
                                                onMouseMove={(event) => {
                                                    if (hoveredSatellite === id) { 
                                                        setTooltipCoords({ x: event.clientX, y: event.clientY });
                                                    }
                                                }}
                                                onClick={() => handleMarkerClick(id)}
                                                style={{ cursor: id.startsWith('IRIDIUM') ? 'pointer' : 'default' }}
                                            >
                                                <circle r={id === 'BEACON' ? 4 : (isActive ? 5 : 3)} fill={getMarkerColor(id, isActive)} stroke="#fff" strokeWidth={0.5} />
                                                <text
                                                    textAnchor="middle"
                                                    y={-8}
                                                    style={{
                                                        fontFamily: 'system-ui',
                                                        fill: getMarkerColor(id, isActive),
                                                        fontSize: '8px',
                                                        fontWeight: 'bold',
                                                        pointerEvents: 'none' 
                                                    }}
                                                >
                                                    {id.startsWith('IRIDIUM') ? id.split(' ').pop() : id}
                                                </text>
                                            </g>
                                        </Marker>
                                    );
                                })()}
                            </React.Fragment>
                        );
                    })}

                    {/* Draw lines for active handshakes */}
                    {beaconTrack && beaconTrack.length > currentTimeIndex && Array.from(currentActiveIridiumIds).map(iridiumId => {
                        const beaconCurrentPos = beaconTrack[currentTimeIndex]?.positionGeodetic;
                        const iridiumSatTrack = allTracks[iridiumId];
                        const iridiumCurrentPos = iridiumSatTrack && iridiumSatTrack.length > currentTimeIndex ? iridiumSatTrack[currentTimeIndex]?.positionGeodetic : null;

                        if (beaconCurrentPos && iridiumCurrentPos) {
                            return (
                                <Line
                                    key={`link-${iridiumId}`}
                                    from={[beaconCurrentPos.longitude, beaconCurrentPos.latitude]}
                                    to={[iridiumCurrentPos.longitude, iridiumCurrentPos.latitude]}
                                    stroke="#00ff00" // Active link color (green)
                                    strokeWidth={1.5}
                                    strokeDasharray="4 2"
                                    strokeOpacity={0.8}
                                />
                            );
                        }
                        return null;
                    })}
                </ZoomableGroup>
            </ComposableMap>
            
            {hoveredSatellite && hoveredSatPosition && tooltipCoords && (
                <div style={{
                    position: 'fixed',
                    left: tooltipCoords.x + 15, // Offset from cursor
                    top: tooltipCoords.y + 15,
                    background: 'rgba(20,20,20,0.85)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    pointerEvents: 'none', // Important so it doesn't block map interactions
                    zIndex: 2000, // Above side panel
                    border: '1px solid #444',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                    <strong>{hoveredSatellite}</strong><br />
                    Lat: {hoveredSatPosition.latitude.toFixed(3)}&deg;<br />
                    Lon: {hoveredSatPosition.longitude.toFixed(3)}&deg;<br />
                    Alt: {hoveredSatPosition.altitude.toFixed(1)} km
                </div>
            )}

            {selectedSatelliteId && (
                <SidePanel 
                    selectedSatelliteId={selectedSatelliteId} 
                    simulationResults={results} 
                    onClose={closeSidePanel} 
                />
            )}
        </div>
    );
};

export default SatVisualization; 