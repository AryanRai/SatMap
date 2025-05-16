import React, { useState, ChangeEvent, FormEvent } from 'react';
import { OrbitType, SunSynchronousOrbitParams, NonPolarOrbitParams, BeaconOrbitParams } from '../types/orbit';

interface OrbitInputFormProps {
    onSubmit: (beaconParams: BeaconOrbitParams) => void;
    isLoading: boolean;
}

const OrbitInputForm: React.FC<OrbitInputFormProps> = ({ onSubmit, isLoading }) => {
    const [orbitType, setOrbitType] = useState<OrbitType>(OrbitType.SunSynchronous);
    const [altitude, setAltitude] = useState<string>('700'); // Default altitude in km
    const [inclination, setInclination] = useState<string>('98'); // Default inclination for SSO
    const [localSolarTime, setLocalSolarTime] = useState<string>('10.5'); // Default LST (e.g., 10:30 AM)

    const handleOrbitTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setOrbitType(event.target.value as OrbitType);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const altNum = parseFloat(altitude);
        if (isNaN(altNum) || altNum <= 0) {
            alert('Please enter a valid positive altitude.');
            return;
        }

        let params: BeaconOrbitParams;

        if (orbitType === OrbitType.SunSynchronous) {
            const lstNum = parseFloat(localSolarTime);
            if (isNaN(lstNum) || lstNum < 0 || lstNum >= 24) {
                alert('Please enter a valid Local Solar Time (0-23.99).');
                return;
            }
            params = {
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
            params = {
                type: OrbitType.NonPolar,
                altitude: altNum,
                inclination: incNum,
            };
        }
        onSubmit(params);
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
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

            <div style={{ marginTop: '20px' }}>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>
        </form>
    );
};

export default OrbitInputForm; 