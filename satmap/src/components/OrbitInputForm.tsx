import React, { useState, ChangeEvent, FormEvent } from 'react';
import { OrbitType, SunSynchronousOrbitParams, NonPolarOrbitParams, BeaconOrbitParams, SimulationConfig } from '../types/orbit';

interface OrbitInputFormProps {
    onSubmit: (config: SimulationConfig) => void;
    isLoading: boolean;
}

const OrbitInputForm: React.FC<OrbitInputFormProps> = ({ onSubmit, isLoading }) => {
    const [orbitType, setOrbitType] = useState<OrbitType>(OrbitType.SunSynchronous);
    const [altitude, setAltitude] = useState<string>('700'); // Default altitude in km
    const [inclination, setInclination] = useState<string>('98'); // Default inclination for SSO
    const [localSolarTime, setLocalSolarTime] = useState<string>('10.5'); // Default LST (e.g., 10:30 AM)

    // New state for additional simulation parameters
    const [iridiumFovDeg, setIridiumFovDeg] = useState<string>('10'); // Default 10 degrees
    const [beaconFovDeg, setBeaconFovDeg] = useState<string>('62'); // Default 62 degrees
    const [simulationDurationHours, setSimulationDurationHours] = useState<string>('24'); // Default 24 hours
    const [simulationTimeStepSec, setSimulationTimeStepSec] = useState<string>('60'); // Default 60 seconds

    const handleOrbitTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setOrbitType(event.target.value as OrbitType);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const altNum = parseFloat(altitude);
        const iridiumFovNum = parseFloat(iridiumFovDeg);
        const beaconFovNum = parseFloat(beaconFovDeg);
        const durationNum = parseFloat(simulationDurationHours);
        const timeStepNum = parseFloat(simulationTimeStepSec);

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

        let beaconParams: BeaconOrbitParams;

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
        } else {
            const incNum = parseFloat(inclination);
            if (isNaN(incNum) || incNum < 0 || incNum > 180) { // SGP4 can handle > 90 for retrograde
                alert('Please enter a valid inclination (0-180 degrees).');
                return;
            }
            beaconParams = {
                type: OrbitType.NonPolar,
                altitude: altNum,
                inclination: incNum,
            };
        }

        const fullConfig: SimulationConfig = {
            beaconParams,
            iridiumFovDeg: iridiumFovNum,
            beaconFovDeg: beaconFovNum,
            simulationDurationHours: durationNum,
            simulationTimeStepSec: timeStepNum,
        };
        onSubmit(fullConfig);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Beacon Satellite Orbit Parameters</h2>
            <div>
                <label htmlFor="orbitType">Orbit Type: </label>
                <select id="orbitType" value={orbitType} onChange={handleOrbitTypeChange}>
                    <option value={OrbitType.SunSynchronous}>Sun-Synchronous</option>
                    <option value={OrbitType.NonPolar}>Non-Polar</option>
                </select>
            </div>

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

            {orbitType === OrbitType.NonPolar && (
                <div style={{ marginTop: '10px' }}>
                    <label htmlFor="inclination">Inclination (degrees): </label>
                    <input
                        type="number"
                        id="inclination"
                        value={inclination}
                        onChange={(e) => setInclination(e.target.value)}
                        placeholder="e.g., 55 (30-98 recommended for challenge)"
                        required
                    />
                </div>
            )}

            <h2 style={{ marginTop: '20px' }}>Simulation Settings</h2>
            <div style={{ marginTop: '10px' }}>
                <label htmlFor="iridiumFov">Iridium FOV (degrees): </label>
                <input
                    type="number"
                    id="iridiumFov"
                    value={iridiumFovDeg}
                    onChange={(e) => setIridiumFovDeg(e.target.value)}
                    placeholder="e.g., 10"
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

            <div style={{ marginTop: '20px' }}>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>
        </form>
    );
};

export default OrbitInputForm; 