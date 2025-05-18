import React from 'react';
import { SimulationResults } from '../types/orbit';

interface PlaybackControlsProps {
    currentTimeIndex: number;
    maxTimeIndex: number;
    isPlaying: boolean;
    onPlayPause: () => void;
    onSliderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onResetTime: () => void;
    currentTimestamp: number | null;
    hasSimulationData: boolean;
    playbackSpeedMultiplier: number;
    onPlaybackSpeedChange: (speed: number) => void;
    isTimelapseActive: boolean;
    onTimelapseToggle: () => void;
    isRealtimeActive: boolean;
    onRealtimeToggle: () => void;
    selectedTimeRange: { start: number; end: number };
    onTimeRangeChange: (newRange: { start: number; end: number }) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    currentTimeIndex,
    maxTimeIndex,
    isPlaying,
    onPlayPause,
    onSliderChange,
    onResetTime,
    currentTimestamp,
    hasSimulationData,
    playbackSpeedMultiplier,
    onPlaybackSpeedChange,
    isTimelapseActive,
    onTimelapseToggle,
    isRealtimeActive,
    onRealtimeToggle,
    selectedTimeRange,
    onTimeRangeChange,
}) => {

    const formatDateTime = (timestamp: number | null): string => {
        if (timestamp === null) return hasSimulationData ? 'Time N/A' : '-';
        try {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return 'Invalid Date';
        }
    };

    return (
        <div 
            className="controls playback-controls-shared" 
            style={{ 
                margin: '10px auto', 
                padding: '10px', 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                gap: '10px', 
                color: '#eee', 
                background: '#333', 
                borderRadius: '8px', 
                maxWidth: '900px' // Match map width for consistency
            }}
            onMouseDownCapture={(e) => e.stopPropagation()} 
            onTouchStartCapture={(e) => e.stopPropagation()} 
        >
            <button onClick={onPlayPause} disabled={!hasSimulationData} style={{ padding: '8px 12px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: hasSimulationData ? 'pointer' : 'default' }}>
                {isPlaying ? 'Pause' : (currentTimeIndex >= maxTimeIndex && maxTimeIndex > 0 ? 'Restart' : 'Play')}
            </button>
            <button onClick={onResetTime} disabled={!hasSimulationData} style={{ padding: '8px 12px', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: hasSimulationData ? 'pointer' : 'default' }}>
                Reset Time
            </button>
            <input
                type="range"
                min="0"
                max={maxTimeIndex}
                value={currentTimeIndex}
                onChange={onSliderChange}
                disabled={!hasSimulationData || maxTimeIndex === 0}
                style={{ flexGrow: 1, cursor: hasSimulationData && maxTimeIndex > 0 ? 'pointer' : 'default' }}
                title={hasSimulationData ? `Time step: ${currentTimeIndex + 1}` : "Simulation data needed"}
            />
            <span 
                className="timestamp-display" 
                style={{
                    minWidth: '170px', // Adjusted width
                    textAlign: 'center', // Centered
                    fontFamily: "Consolas, Monaco, monospace", // Corrected font family string
                    fontSize: '0.95em', // Slightly smaller
                    padding: '5px 8px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    border: '1px solid #444'
                }}
            >
                {formatDateTime(currentTimestamp)}
            </span>

            {/* Playback Speed Control */}
            <div className="playback-speed-control" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label htmlFor="playbackSpeedSelect" style={{ fontSize: '0.9em', marginRight: '3px', display: 'flex', alignItems: 'center', paddingTop: '2px' }}>Speed:</label>
                <select 
                    id="playbackSpeedSelect"
                    value={playbackSpeedMultiplier}
                    onChange={(e) => onPlaybackSpeedChange(Number(e.target.value))}
                    disabled={!hasSimulationData || isTimelapseActive || isRealtimeActive} // Disable if timelapse or realtime is active
                    style={{ padding: '5px 8px', background: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px', cursor: (hasSimulationData && !isTimelapseActive && !isRealtimeActive) ? 'pointer' : 'default' }}
                >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                    <option value={8}>8x</option>
                </select>
            </div>

            {/* Timelapse Toggle Button */}
            <button 
                onClick={onTimelapseToggle}
                disabled={!hasSimulationData}
                style={{
                    padding: '8px 12px', 
                    background: isTimelapseActive ? '#007bff' : '#555', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: hasSimulationData ? 'pointer' : 'default',
                    minWidth: '100px' // Ensure consistent width
                }}
            >
                {isTimelapseActive ? 'Timelapse ON' : 'Timelapse OFF'}
            </button>

            {/* Realtime Toggle Button */}
            <button 
                onClick={onRealtimeToggle}
                disabled={!hasSimulationData}
                style={{
                    padding: '8px 12px', 
                    background: isRealtimeActive ? '#28a745' : '#555', // Green when active
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: hasSimulationData ? 'pointer' : 'default',
                    minWidth: '100px' // Ensure consistent width
                }}
            >
                {isRealtimeActive ? 'Realtime ON' : 'Realtime OFF'}
            </button>

            {/* Time Range Selection Sliders */}
            {hasSimulationData && maxTimeIndex > 0 && (
                <div className="time-range-controls" style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em' }}>
                        <span>Range Start: {selectedTimeRange.start}</span>
                        <span>End: {selectedTimeRange.end}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <label htmlFor="timeRangeStartSlider" style={{fontSize: '0.8em'}}>Start:</label>
                        <input 
                            type="range"
                            id="timeRangeStartSlider"
                            min="0"
                            max={maxTimeIndex}
                            value={selectedTimeRange.start}
                            onChange={(e) => {
                                const newStart = Number(e.target.value);
                                if (newStart <= selectedTimeRange.end) {
                                    onTimeRangeChange({ ...selectedTimeRange, start: newStart });
                                }
                            }}
                            style={{ width: '100%' }}
                            disabled={!hasSimulationData}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <label htmlFor="timeRangeEndSlider" style={{fontSize: '0.8em'}}>End:&nbsp;&nbsp;</label>
                        <input 
                            type="range"
                            id="timeRangeEndSlider"
                            min="0"
                            max={maxTimeIndex}
                            value={selectedTimeRange.end}
                            onChange={(e) => {
                                const newEnd = Number(e.target.value);
                                if (newEnd >= selectedTimeRange.start) {
                                    onTimeRangeChange({ ...selectedTimeRange, end: newEnd });
                                }
                            }}
                            style={{ width: '100%' }}
                            disabled={!hasSimulationData}
                        />
                    </div>
                </div>
            )}

            {hasSimulationData && (
                <span className="step-display" style={{ fontSize: '0.9em' }}>Step: {currentTimeIndex + 1} / {maxTimeIndex + 1}</span>
            )}
        </div>
    );
};

export default PlaybackControls; 