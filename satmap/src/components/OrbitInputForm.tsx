import React, { useState, ChangeEvent, FormEvent } from 'react';
import { OrbitType, SunSynchronousOrbitParams, NonPolarOrbitParams, BeaconOrbitParams, SimulationConfig } from '../types/orbit';
import { IridiumDatasetType } from '../services/tleService';

/**
 * Props for the OrbitInputForm component.
 */
interface OrbitInputFormProps {
    /** Function to call when the form is submitted with valid simulation configuration. */
    onSubmit: (config: SimulationConfig) => void;
    /** Boolean indicating if a simulation is currently in progress (to disable the submit button). */
    isLoading: boolean;
}

/**
 * OrbitInputForm component.
 * This form allows users to specify parameters for the Beacon satellite's orbit,
 * configure general simulation settings (like FOVs, duration, time step),
 * and select which Iridium TLE datasets to use.
 * On submission, it validates the input and calls the `onSubmit` prop with the constructed `SimulationConfig`.
 */
const OrbitInputForm: React.FC<OrbitInputFormProps> = ({ onSubmit, isLoading }) => {
    // State for selecting the Beacon satellite's orbit type.
    const [orbitType, setOrbitType] = useState<OrbitType>(OrbitType.SunSynchronous);
    // State for the Beacon's altitude in kilometers.
    const [altitude, setAltitude] = useState<string>('550');
    // State for the Beacon's orbital inclination in degrees (used for Non-Polar orbits).
    const [inclination, setInclination] = useState<string>('98'); // Default for NonPolar if switched, also a common SSO value.
    // State for the Local Solar Time at Descending Node in hours (used for Sun-Synchronous orbits).
    const [localSolarTime, setLocalSolarTime] = useState<string>('10.5');

    // State for general simulation settings.
    const [iridiumFovDeg, setIridiumFovDeg] = useState<string>('62'); // Iridium Field of View in degrees.
    const [beaconFovDeg, setBeaconFovDeg] = useState<string>('62');   // Beacon Field of View in degrees.
    const [simulationDurationHours, setSimulationDurationHours] = useState<string>('24'); // Simulation duration in hours.
    const [simulationTimeStepSec, setSimulationTimeStepSec] = useState<string>('60');   // Simulation time step in seconds.
    const [simulationStartTime, setSimulationStartTime] = useState<string>(''); // New state for start time

    // State for managing the selection of Iridium TLE dataset sources.
    const [selectedDatasets, setSelectedDatasets] = useState<IridiumDatasetType[]>(["IRIDIUM", "IRIDIUM-NEXT"]);

    // State for handshake mode
    const [handshakeMode, setHandshakeMode] = useState<'one-way' | 'bi-directional'>('bi-directional');

    /**
     * Handles changes to the orbit type selection.
     * Updates the `orbitType` state.
     */
    const handleOrbitTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setOrbitType(event.target.value as OrbitType);
    };

    /**
     * Handles changes in the Iridium dataset selection checkboxes.
     * Toggles the inclusion of a dataset in the `selectedDatasets` state array.
     */
    const handleDatasetChange = (event: ChangeEvent<HTMLInputElement>) => {
        const dataset = event.target.value as IridiumDatasetType;
        setSelectedDatasets(prev =>
            prev.includes(dataset)
                ? prev.filter(d => d !== dataset) // Remove if already selected
                : [...prev, dataset]              // Add if not selected
        );
    };

    /**
     * Handles the form submission event.
     * Prevents the default form submission, validates all input fields,
     * constructs the `BeaconOrbitParams` and `SimulationConfig` objects,
     * and then calls the `onSubmit` prop with the configuration.
     * Displays alerts for invalid input.
     */
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Parse string inputs to numbers
        const altNum = parseFloat(altitude);
        const iridiumFovNum = parseFloat(iridiumFovDeg);
        const beaconFovNum = parseFloat(beaconFovDeg);
        const durationNum = parseFloat(simulationDurationHours);
        const timeStepNum = parseFloat(simulationTimeStepSec);

        // Input validation for general simulation settings
        if (isNaN(altNum) || altNum <= 0) {
            alert('Please enter a valid positive altitude.');
            return;
        }
        if (isNaN(iridiumFovNum) || iridiumFovNum <= 0 || iridiumFovNum > 180) {
            alert('Please enter a valid Iridium FOV (1-180 degrees).');
            return;
        }
        if (isNaN(beaconFovNum) || beaconFovNum <= 0 || beaconFovNum > 180) {
            alert('Please enter a valid Beacon FOV (1-180 degrees).');
            return;
        }
        if (isNaN(durationNum) || durationNum <= 0) {
            alert('Please enter a valid positive simulation duration.');
            return;
        }
        if (isNaN(timeStepNum) || timeStepNum <= 0) {
            alert('Please enter a valid positive simulation time step.');
            return;
        }
        if (selectedDatasets.length === 0) {
            alert('Please select at least one Iridium dataset source.');
            return;
        }

        let beaconParams: BeaconOrbitParams;

        // Construct Beacon parameters based on the selected orbit type
        if (orbitType === OrbitType.SunSynchronous) {
            const lstNum = parseFloat(localSolarTime);
            if (isNaN(lstNum) || lstNum < 0 || lstNum >= 24) {
                alert('Please enter a valid Local Solar Time (0-23.99).');
                return;
            }
            beaconParams = {
                type: OrbitType.SunSynchronous,
                altitude: altNum,
                localSolarTimeAtDescendingNode: lstNum,
            };
        } else { // OrbitType.NonPolar
            const incNum = parseFloat(inclination);
            // SGP4 can handle inclinations > 90 degrees for retrograde orbits, up to 180.
            if (isNaN(incNum) || incNum < 0 || incNum > 180) { 
                alert('Please enter a valid inclination (0-180 degrees).');
                return;
            }
            beaconParams = {
                type: OrbitType.NonPolar,
                altitude: altNum,
                inclination: incNum,
                // RAAN is optional and defaults in the TLE generation if not provided.
            };
        }

        // Construct the full simulation configuration object
        const fullConfig: SimulationConfig = {
            beaconParams,
            iridiumFovDeg: iridiumFovNum,
            beaconFovDeg: beaconFovNum,
            simulationDurationHours: durationNum,
            simulationTimeStepSec: timeStepNum,
            iridiumDatasetSources: selectedDatasets,
            handshakeMode: handshakeMode,
            startTimeISO: simulationStartTime,
        };
        
        // Pass the configuration to the parent component
        onSubmit(fullConfig);
    };

    return (
        <form onSubmit={handleSubmit} className="orbit-input-form"> {/* Added a class for potential styling */}
            <h2>Beacon Satellite Orbit Parameters</h2>
            
            {/* Orbit Type Selection */}
            <div>
                <label htmlFor="orbitType">Orbit Type: </label>
                <select id="orbitType" value={orbitType} onChange={handleOrbitTypeChange}>
                    <option value={OrbitType.SunSynchronous}>Sun-Synchronous</option>
                    <option value={OrbitType.NonPolar}>Non-Polar</option>
                </select>
            </div>

            {/* Altitude Input (Common for all orbit types) */}
            <div style={{ marginTop: '10px' }}>
                <label htmlFor="altitude">Altitude (km): </label>
                <input
                    type="number"
                    id="altitude"
                    value={altitude}
                    onChange={(e) => setAltitude(e.target.value)}
                    placeholder="e.g., 700"
                    required
                />
            </div>

            {/* Conditional Inputs for Sun-Synchronous Orbit */}
            {orbitType === OrbitType.SunSynchronous && (
                <div style={{ marginTop: '10px' }}>
                    <label htmlFor="localSolarTime">Local Solar Time at Descending Node (hours): </label>
                    <input
                        type="number"
                        id="localSolarTime"
                        value={localSolarTime}
                        onChange={(e) => setLocalSolarTime(e.target.value)}
                        placeholder="e.g., 10.5 for 10:30 AM"
                        step="0.1"
                        required
                    />
                </div>
            )}

            {/* Conditional Inputs for Non-Polar Orbit */}
            {orbitType === OrbitType.NonPolar && (
                <div style={{ marginTop: '10px' }}>
                    <label htmlFor="inclination">Inclination (degrees): </label>
                    <input
                        type="number"
                        id="inclination"
                        value={inclination}
                        onChange={(e) => setInclination(e.target.value)}
                        placeholder="e.g., 55 (0-180 valid)"
                        required
                    />
                </div>
            )}

            {/* General Simulation Settings Section */}
            <h2 style={{ marginTop: '20px' }}>Simulation Settings</h2>
            
            {/* Start Time Input - Styled for consistency */}
            <div className="form-field-group" style={{ marginTop: '10px' }}>
                <label htmlFor="simulationStartTime">Simulation Start Time (UTC, Optional):</label>
                <input
                    type="datetime-local"
                    id="simulationStartTime"
                    value={simulationStartTime}
                    onChange={(e) => setSimulationStartTime(e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        backgroundColor: '#333',
                        color: '#E0E0E0',
                        fontFamily: 'inherit',
                        colorScheme: 'dark', // Helps with date picker appearance in dark themes
                    }}
                />
            </div>

            <div style={{ marginTop: '10px' }}>
                <label htmlFor="iridiumFov">Iridium FOV (degrees): </label>
                <input
                    type="number"
                    id="iridiumFov"
                    value={iridiumFovDeg}
                    onChange={(e) => setIridiumFovDeg(e.target.value)}
                    placeholder="e.g., 62"
                    min="1" max="180"
                    required
                />
            </div>
            <div style={{ marginTop: '10px' }}>
                <label htmlFor="beaconFov">Beacon FOV (degrees): </label>
                <input
                    type="number"
                    id="beaconFov"
                    value={beaconFovDeg}
                    onChange={(e) => setBeaconFovDeg(e.target.value)}
                    placeholder="e.g., 62"
                     min="1" max="180"
                    required
                />
            </div>
            <div style={{ marginTop: '10px' }}>
                <label htmlFor="simulationDuration">Simulation Duration (hours): </label>
                <input
                    type="number"
                    id="simulationDuration"
                    value={simulationDurationHours}
                    onChange={(e) => setSimulationDurationHours(e.target.value)}
                    placeholder="e.g., 24"
                    min="0.1" step="0.1"
                    required
                />
            </div>
            <div style={{ marginTop: '10px' }}>
                <label htmlFor="simulationTimeStep">Time Step (seconds): </label>
                <input
                    type="number"
                    id="simulationTimeStep"
                    value={simulationTimeStepSec}
                    onChange={(e) => setSimulationTimeStepSec(e.target.value)}
                    placeholder="e.g., 60"
                    min="1"
                    required
                />
            </div>

            {/* Handshake Mode Selection */}
            <div style={{ marginTop: '10px' }}>
                <label htmlFor="handshakeMode">Handshake Logic: </label>
                <select 
                    id="handshakeMode" 
                    value={handshakeMode} 
                    onChange={(e) => setHandshakeMode(e.target.value as 'one-way' | 'bi-directional')}
                >
                    <option value="one-way">One-Way (Iridium Nadir Cone - Beacon Directly Overhead)</option>
                    <option value="bi-directional">Bi-Directional (Mutual Horizon Scanning)</option>
                </select>
            </div>

            {/* Iridium Dataset Selection Section */}
            <h3 style={{ marginTop: '20px' }}>Iridium Constellation Data Source(s)</h3>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                 <div>
                    <input
                        type="checkbox"
                        id="iridium-original"
                        value="IRIDIUM"
                        checked={selectedDatasets.includes("IRIDIUM")}
                        onChange={handleDatasetChange}
                    />
                    <label htmlFor="iridium-original" style={{ marginLeft: '5px' }}>Iridium (Original Block 1)</label>
                </div>
                <div>
                    <input
                        type="checkbox"
                        id="iridium-next"
                        value="IRIDIUM-NEXT"
                        checked={selectedDatasets.includes("IRIDIUM-NEXT")}
                        onChange={handleDatasetChange}
                    />
                    <label htmlFor="iridium-next" style={{ marginLeft: '5px' }}>Iridium-NEXT</label>
                </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '20px' }}>
                <button type="submit" disabled={isLoading} className="submit-button"> {/* Added a class for potential styling */}
                    {isLoading ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>
        </form>
    );
};

export default OrbitInputForm; 