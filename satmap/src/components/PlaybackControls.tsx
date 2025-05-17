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
}) => {
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
            <span className="timestamp-display" style={{ minWidth: '180px', textAlign: 'right' }}>
                {currentTimestamp ? new Date(currentTimestamp).toLocaleString() : (hasSimulationData ? 'Time N/A' : '-')}
            </span>
            {hasSimulationData && (
                <span className="step-display" style={{ fontSize: '0.9em' }}>Step: {currentTimeIndex + 1} / {maxTimeIndex + 1}</span>
            )}
        </div>
    );
};

export default PlaybackControls; 