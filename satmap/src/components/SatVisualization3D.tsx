import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationResults, SatellitePosition, GeodeticPosition, CartesianVector } from '../types/orbit';
import {
    createHorizonAlignedAntennaCones,
    createIridiumCone,
    // Assuming vector math utilities like add, scale, normalize might be needed from geometry.ts
    // For now, THREE.Vector3 methods will be used for simplicity where possible
} from '../utils/geometry';
// We will import geometry utilities later as needed
// import { GeometricCone, createIridiumCone, createBeaconAntennaCones } from '../utils/geometry';

// Constants for 3D visualization
const EARTH_RADIUS_KM_3D = 6.371; // Visual radius for the 3D scene
const ACTUAL_EARTH_RADIUS_KM = 6371.0; // Actual Earth radius for physics calculations
const SATELLITE_ORBIT_SCALE_FACTOR = 1 / 1000;
const SATELLITE_VISUAL_SIZE = 0.05; // Visual size of satellite spheres in scene units
const CONE_VISUAL_SCALE_FACTOR = 0.1; // Scales cone length
const CONE_VISUAL_HEIGHT = 1.5; // Visual height of the cone in scene units
const CONE_RADIAL_SEGMENTS = 16; // Fewer segments for performance
const LABEL_OFFSET_Y = 0.1;
const LABEL_FONT_SIZE = 0.14;
const FOOTPRINT_CIRCLE_SEGMENTS = 32;
const FOOTPRINT_OFFSET_FROM_SURFACE = 0.01; // Slightly above surface to avoid z-fighting

interface SatVisualization3DProps {
    results: SimulationResults | null;
    currentTimeIndex: number;
    showCommunicationCones: boolean;
    beaconFovDeg?: number;
    iridiumFovDeg?: number;
    selectedSatelliteId?: string | null;
    onSatelliteSelect?: (id: string) => void;
    showSatelliteTrails?: boolean;
    showSatelliteLabels?: boolean;
    selectedTimeRange: { start: number; end: number };
}

const SatVisualization3D: React.FC<SatVisualization3DProps> = ({
    results,
    currentTimeIndex,
    showCommunicationCones,
    beaconFovDeg,
    iridiumFovDeg,
    selectedSatelliteId,
    onSatelliteSelect,
    showSatelliteTrails = true,
    showSatelliteLabels = true,
    selectedTimeRange,
}) => {
    const { beaconTrack, iridiumTracks, handshakeLog, activeLinksLog } = results || {};
    const hasSimulationData = !!(results && beaconTrack && beaconTrack.length > 0 && iridiumTracks);

    const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth_texture.jpg');
    const earthGeometry = useMemo(() => new THREE.SphereGeometry(EARTH_RADIUS_KM_3D, 64, 64), []);
    const earthMaterial = useMemo(() => new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.9, metalness: 0.1 }), [earthTexture]);

    const satelliteGeometry = useMemo(() => new THREE.SphereGeometry(SATELLITE_VISUAL_SIZE, 16, 16), []);
    const baseBeaconMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'orange' }), []);
    const baseIridiumMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'lightblue' }), []);
    const highlightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'yellow', emissive: 'yellow', emissiveIntensity: 0.7 }), []);

    const beaconConeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'gold', transparent: true, opacity: 0.25, side: THREE.DoubleSide }), []);
    const iridiumConeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'cyan', transparent: true, opacity: 0.25, side: THREE.DoubleSide }), []);
    const iridiumFootprintMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#61dafb', transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false }), []); // Aqua/cyan like, no depth write for overlay
    const activeLinkMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#00ff00', linewidth: 1.5, transparent: true, opacity: 0.7 }), []); // Lime green for active links

    const currentBeaconSat = hasSimulationData ? beaconTrack?.[currentTimeIndex] : null;
    let beaconDisplayPosition: THREE.Vector3 | null = null;
    if (currentBeaconSat?.positionEci) {
        beaconDisplayPosition = eciToThreeJS(currentBeaconSat.positionEci, SATELLITE_ORBIT_SCALE_FACTOR);
    }

    // Memoize processed Iridium data including 3D positions and necessary original data for calcs
    const iridiumDisplayData = useMemo(() => {
        if (!hasSimulationData || !iridiumTracks) return [];
        return Object.entries(iridiumTracks).map(([satelliteId, track]) => {
            const satDataAtCurrentTime = track[currentTimeIndex];
            if (satDataAtCurrentTime?.positionEci && satDataAtCurrentTime?.positionGeodetic) {
                return {
                    id: satelliteId,
                    position3D: eciToThreeJS(satDataAtCurrentTime.positionEci, SATELLITE_ORBIT_SCALE_FACTOR),
                    eciPos: satDataAtCurrentTime.positionEci, // Keep original ECI for cone/footprint calc
                    altitudeKm: satDataAtCurrentTime.positionGeodetic.altitude, // Keep altitude for footprint
                };
            }
            return null;
        }).filter(p => p !== null) as { id: string; position3D: THREE.Vector3; eciPos: CartesianVector; altitudeKm: number }[];
    }, [iridiumTracks, currentTimeIndex, hasSimulationData]);

    // Memoize trail points for performance
    const beaconTrailPoints = useMemo(() => {
        if (!hasSimulationData || !beaconTrack || beaconTrack.length < 1) return null;
        const CappedStart = Math.max(0, selectedTimeRange.start);
        const CappedEnd = Math.min(beaconTrack.length -1 , selectedTimeRange.end);
        if (CappedStart > CappedEnd) return null; // Empty range after capping
        const slicedTrack = beaconTrack.slice(CappedStart, CappedEnd + 1);
        if (slicedTrack.length < 2) return null; // Not enough points for a line
        return slicedTrack.map(p => eciToThreeJS(p.positionEci, SATELLITE_ORBIT_SCALE_FACTOR));
    }, [hasSimulationData, beaconTrack, selectedTimeRange]);
    
    const iridiumTrailPointsMap = useMemo(() => {
        if (!hasSimulationData || !iridiumTracks) return {};
        const map: Record<string, THREE.Vector3[]> = {};
        Object.entries(iridiumTracks).forEach(([id, track]) => {
            if (track.length < 1) return;
            const CappedStart = Math.max(0, selectedTimeRange.start);
            const CappedEnd = Math.min(track.length - 1, selectedTimeRange.end);
            if (CappedStart > CappedEnd) return; // Empty range
            const slicedTrack = track.slice(CappedStart, CappedEnd + 1);
            if (slicedTrack.length >= 2) {
                map[id] = slicedTrack.map(p => eciToThreeJS(p.positionEci, SATELLITE_ORBIT_SCALE_FACTOR));
            }
        });
        return map;
    }, [hasSimulationData, iridiumTracks, selectedTimeRange]);

    const currentActiveIridiumSatIds = useMemo(() => {
        return (hasSimulationData && activeLinksLog && activeLinksLog[currentTimeIndex]) 
            ? activeLinksLog[currentTimeIndex] 
            : new Set<string>();
    }, [activeLinksLog, currentTimeIndex, hasSimulationData]);

    return (
        <div style={{ height: 'calc(100vh - 250px)', minHeight:'500px', background: '#000005' }}> {/* Darker background */}
            <Canvas camera={{ position: [0, 0, EARTH_RADIUS_KM_3D * 3.5], fov: 45, near: 0.1, far: EARTH_RADIUS_KM_3D * 50 }}>
                <ambientLight intensity={0.5} /> {/* Slightly increased ambient light */}
                <directionalLight position={[10, 10, 5]} intensity={1.0} castShadow />
                <Stars radius={200} depth={80} count={8000} factor={6} saturation={0} fade speed={0.3} />

                <mesh geometry={earthGeometry} material={earthMaterial} receiveShadow />

                {/* Orbit Trails */}
                {hasSimulationData && showSatelliteTrails && beaconTrailPoints && beaconTrailPoints.length >=2 && (() => {
                    const trailGeo = new THREE.BufferGeometry().setFromPoints(beaconTrailPoints);
                    const trailMat = new THREE.LineBasicMaterial({ color: "orange", linewidth: 1.2 });
                    const trailLine = new THREE.Line(trailGeo, trailMat);
                    return <primitive object={trailLine} />;
                })()}
                {hasSimulationData && showSatelliteTrails && Object.entries(iridiumTrailPointsMap).map(([id, points]) => {
                    if (points.length >= 2) {
                        const trailGeo = new THREE.BufferGeometry().setFromPoints(points);
                        const trailMat = new THREE.LineBasicMaterial({ color: "#87cefa", linewidth: 1 });
                        const trailLine = new THREE.Line(trailGeo, trailMat);
                        return <primitive key={`trail-${id}`} object={trailLine} />;
                    }
                    return null;
                })}

                {/* Satellites & Labels */}
                {hasSimulationData && beaconDisplayPosition && (
                    <group>
                        <mesh castShadow position={beaconDisplayPosition} geometry={satelliteGeometry} material={selectedSatelliteId === 'Beacon' ? highlightMaterial : baseBeaconMaterial} onClick={() => onSatelliteSelect?.('Beacon')} />
                        {showSatelliteLabels && <Text position={[beaconDisplayPosition.x, beaconDisplayPosition.y + LABEL_OFFSET_Y, beaconDisplayPosition.z]} fontSize={LABEL_FONT_SIZE} color="orange" anchorX="center" anchorY="middle">Beacon</Text>}
                    </group>
                )}
                {hasSimulationData && iridiumDisplayData.map(sat => (
                    <group key={`group-${sat.id}`}>
                        <mesh castShadow key={sat.id} position={sat.position3D} geometry={satelliteGeometry} material={selectedSatelliteId === sat.id ? highlightMaterial : baseIridiumMaterial} onClick={() => onSatelliteSelect?.(sat.id)} />
                        {showSatelliteLabels && <Text position={[sat.position3D.x, sat.position3D.y + LABEL_OFFSET_Y, sat.position3D.z]} fontSize={LABEL_FONT_SIZE} color="lightblue" anchorX="center" anchorY="middle">{sat.id.replace('IRIDIUM ', 'I-')}</Text>}
                    </group>
                ))}

                {/* Filtered Handshake Markers based on Time Range */}
                {hasSimulationData && showSatelliteLabels && handshakeLog && beaconTrack && beaconTrack.length > 0 && (() => {
                    const rangeStartTime = beaconTrack[selectedTimeRange.start]?.timestamp;
                    const rangeEndTime = beaconTrack[selectedTimeRange.end]?.timestamp;

                    if (rangeStartTime === undefined || rangeEndTime === undefined) return null;

                    return handshakeLog.filter(h => h.timestamp >= rangeStartTime && h.timestamp <= rangeEndTime)
                        .map((handshake, index) => (
                            <MarkerProxy key={`handshake-${handshake.timestamp}-${index}`} position={handshake.beaconPosition} />
                        ));
                })()}

                {/* Communication Cones and Footprints */}
                {hasSimulationData && showCommunicationCones && (
                    <>
                        {/* Beacon Cones */}
                        {currentBeaconSat?.positionEci && currentBeaconSat?.velocityEci && beaconFovDeg && beaconDisplayPosition &&
                            createHorizonAlignedAntennaCones(currentBeaconSat.positionEci, currentBeaconSat.velocityEci, THREE.MathUtils.degToRad(beaconFovDeg / 2), 'BEACON_3D_CONE')
                            .map((cone, index) => {
                                const coneAxisVec3 = eciVecToThreeJSVec(cone.axis); // Beacon cone axis is correct as is
                                const coneHeight = CONE_VISUAL_HEIGHT * 0.8;
                                const coneRadius = Math.tan(cone.halfAngle) * coneHeight;
                                if (coneRadius <= 0) return null;
                                
                                const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, CONE_RADIAL_SEGMENTS, 1, true);
                                const coneMesh = new THREE.Mesh(coneGeometry, beaconConeMaterial);
                                coneMesh.position.copy(beaconDisplayPosition!);
                                const defaultDir = new THREE.Vector3(0, 1, 0);
                                coneMesh.quaternion.setFromUnitVectors(defaultDir, coneAxisVec3);
                                coneMesh.translateY(-coneHeight / 2); 
                                return <primitive key={`beacon-cone-${index}`} object={coneMesh} />;
                            })}

                        {/* Iridium Cones & Footprints */}
                        {iridiumFovDeg && iridiumDisplayData.map(iridiumSat => {
                            const originalIridiumSatEciPos = iridiumSat.eciPos;
                            const iridiumSat3DPos = iridiumSat.position3D;
                            if (originalIridiumSatEciPos && iridiumSat3DPos) {
                                const iridiumGeometricCone = createIridiumCone(originalIridiumSatEciPos, THREE.MathUtils.degToRad(iridiumFovDeg / 2), iridiumSat.id);
                                // For Iridium nadir cone, if it visually points away from Earth, negate its axis.
                                let coneAxisVec3 = eciVecToThreeJSVec(iridiumGeometricCone.axis).negate(); 

                                const coneHeight = CONE_VISUAL_HEIGHT; 
                                const coneRadiusAtBase = Math.tan(iridiumGeometricCone.halfAngle) * coneHeight;
                                if (coneRadiusAtBase <=0) return null;

                                const iridiumConeGeom = new THREE.ConeGeometry(coneRadiusAtBase, coneHeight, CONE_RADIAL_SEGMENTS, 1, true);
                                const coneSatMesh = new THREE.Mesh(iridiumConeGeom, iridiumConeMaterial);
                                coneSatMesh.position.copy(iridiumSat3DPos);
                                const defaultConeDir = new THREE.Vector3(0, 1, 0);
                                coneSatMesh.quaternion.setFromUnitVectors(defaultConeDir, coneAxisVec3);
                                coneSatMesh.translateY(-coneHeight / 2); // Changed to -coneHeight / 2

                                return (
                                    <React.Fragment key={`iridium-vis-${iridiumSat.id}`}>
                                        <primitive object={coneSatMesh} />
                                        <IridiumFootprintCircleRevised
                                            iridiumEciPos={originalIridiumSatEciPos}
                                            iridiumAltitudeKm={iridiumSat.altitudeKm}
                                            iridiumFovDeg={iridiumFovDeg}
                                            earthRadius3D={EARTH_RADIUS_KM_3D}
                                            actualEarthRadiusKm={ACTUAL_EARTH_RADIUS_KM}
                                            material={iridiumFootprintMaterial}
                                        />
                                    </React.Fragment>
                                );
                            }
                            return null;
                        })}
                    </>
                )}

                {/* Active Communication Link Lines */}
                {hasSimulationData && beaconDisplayPosition && currentActiveIridiumSatIds.size > 0 &&
                    Array.from(currentActiveIridiumSatIds).map(iridiumId => {
                        const iridiumSatInfo = iridiumDisplayData.find(s => s.id === iridiumId);
                        if (iridiumSatInfo?.position3D && beaconDisplayPosition) { 
                            const points: [THREE.Vector3, THREE.Vector3] = [beaconDisplayPosition, iridiumSatInfo.position3D];
                            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                            const lineObject = new THREE.Line(lineGeometry, activeLinkMaterial);
                            return (
                                <primitive key={`link-${iridiumId}`} object={lineObject} />
                            );
                        }
                        return null;
                    })
                }
                <OrbitControls enableZoom={true} enablePan={true} minDistance={EARTH_RADIUS_KM_3D * 1.05} maxDistance={EARTH_RADIUS_KM_3D * 30} />
            </Canvas>
        </div>
    );
};

// Helper to convert ECI {x,y,z} to THREE.Vector3 (x, z, -y) applying scale
const eciToThreeJS = (eci: CartesianVector, scale: number): THREE.Vector3 => {
    return new THREE.Vector3(
        eci.x * scale,
        eci.z * scale, // ECI Z maps to Three.js Y (up)
        -eci.y * scale // ECI Y maps to negative Three.js Z
    );
};

// Helper to convert ECI vector (for direction) to THREE.Vector3 (x, z, -y) and normalize
const eciVecToThreeJSVec = (eciVec: CartesianVector): THREE.Vector3 => {
    return new THREE.Vector3(eciVec.x, eciVec.z, -eciVec.y).normalize();
};

// Component to render an orbit trail
interface OrbitTrailProps {
    track: SatellitePosition[];
    color: THREE.ColorRepresentation;
    scaleFactor: number;
}

const OrbitTrail: React.FC<OrbitTrailProps> = ({ track, color, scaleFactor }) => {
    const geometry = useMemo(() => {
        const pointsVec3 = track.map(pos => eciToThreeJS(pos.positionEci, scaleFactor));
        if (pointsVec3.length < 2) return null;
        return new THREE.BufferGeometry().setFromPoints(pointsVec3);
    }, [track, scaleFactor]);

    // Create the THREE.Line object directly
    // This useMemo call must not be conditional
    const lineObject = useMemo(() => {
        if (!geometry) return null; // Handle null geometry case
        return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
    }, [geometry, color]);

    if (!lineObject) return null; // Early return if lineObject couldn't be created

    return <primitive object={lineObject} />;
};

interface IridiumFootprintCircleProps {
    iridiumEciPos: CartesianVector;
    iridiumAltitudeKm: number;
    iridiumFovDeg: number;
    earthRadius3D: number;
    actualEarthRadiusKm: number;
    material: THREE.Material;
}

// Revised IridiumFootprintCircle to correctly use quaternion for orientation
const IridiumFootprintCircleRevised: React.FC<IridiumFootprintCircleProps> = React.memo(({
    iridiumEciPos, iridiumAltitudeKm, iridiumFovDeg, earthRadius3D, actualEarthRadiusKm, material,
}) => {
    const footprintMeshRef = useRef<THREE.Mesh>(null!);

    const footprintData = useMemo(() => {
        const alpha_rad = THREE.MathUtils.degToRad(iridiumFovDeg / 2);
        const H_km = iridiumAltitudeKm;
        const R_earth_km = actualEarthRadiusKm;
        // Updated calculation for sin_beta_arg to avoid issues if Math.sin(alpha_rad) is slightly > 1 due to precision with large (R_earth_km + H_km) / R_earth_km
        const sin_alpha_clamped = Math.min(1, Math.max(-1, Math.sin(alpha_rad))); // Clamp sin(alpha)
        const sin_beta_arg = ((R_earth_km + H_km) / R_earth_km) * sin_alpha_clamped;

        if (sin_beta_arg >= 1.0 - 1e-9) { // cone does not intersect Earth or is tangent
            return null;
        }
        // Ensure a valid argument for asin after floating point arithmetic
        const beta_rad = Math.asin(Math.min(1.0 - 1e-9, Math.max(-1.0 + 1e-9, sin_beta_arg))); 
        const gamma_rad = beta_rad - alpha_rad; // Geocentric angle to the edge of the footprint

        if (gamma_rad <= 1e-9) { // Footprint is negligible or calculation resulted in non-positive angle
            return null;
        }

        const footprintVisualRadius = earthRadius3D * Math.sin(gamma_rad);
        if (footprintVisualRadius <= 1e-9) { // Visual radius is too small
            return null;
        }
        
        const subSatDirection = new THREE.Vector3(iridiumEciPos.x, iridiumEciPos.z, -iridiumEciPos.y).normalize();
        const circlePosition = subSatDirection.clone().multiplyScalar(earthRadius3D + FOOTPRINT_OFFSET_FROM_SURFACE);
        
        const geometry = new THREE.CircleGeometry(footprintVisualRadius, FOOTPRINT_CIRCLE_SEGMENTS);
        return { geometry, position: circlePosition, normal: subSatDirection };
    }, [iridiumEciPos, iridiumAltitudeKm, iridiumFovDeg, earthRadius3D, actualEarthRadiusKm]);

    useEffect(() => {
        if (footprintData && footprintMeshRef.current) {
            // CircleGeometry lies in the XY plane, so its default normal is along the Z-axis (0,0,1).
            const defaultNormal = new THREE.Vector3(0, 0, 1);
            footprintMeshRef.current.quaternion.setFromUnitVectors(defaultNormal, footprintData.normal);
        }
    }, [footprintData]);

    if (!footprintData) return null;
    return <mesh ref={footprintMeshRef} geometry={footprintData.geometry} position={footprintData.position} material={material} />;
});

// Simple Marker for Handshakes (replace MarkerProxy call if that's not a defined pattern)
const MarkerProxy: React.FC<{ position: GeodeticPosition }> = ({ position }) => {
    // Convert Geodetic (lat, lon, alt) to a 3D position on the Earth's surface for the marker
    // This is a simplified approach; actual altitude of handshake might be slightly above surface.
    // For visual purposes, placing on surface is often fine.
    const cartesianPosition = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - position.latitude);
    const theta = THREE.MathUtils.degToRad(position.longitude);
    const visualRadius = EARTH_RADIUS_KM_3D + 0.02; // Slightly above surface

    cartesianPosition.setFromSphericalCoords(visualRadius, phi, theta);

    return (
        <mesh position={cartesianPosition}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="gold" emissive="gold" emissiveIntensity={1} />
        </mesh>
    );
};

export default SatVisualization3D; 