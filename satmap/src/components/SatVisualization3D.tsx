import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationResults, SatellitePosition, GeodeticPosition, CartesianVector } from '../types/orbit';
import {
    createBeaconAntennaCones,
    createIridiumCone,
    // Assuming vector math utilities like add, scale, normalize might be needed from geometry.ts
    // For now, THREE.Vector3 methods will be used for simplicity where possible
} from '../utils/geometry';
// We will import geometry utilities later as needed
// import { GeometricCone, createIridiumCone, createBeaconAntennaCones } from '../utils/geometry';

// Constants for 3D visualization (can be adjusted)
const EARTH_RADIUS_KM_3D = 6.371; // Using a smaller, scaled radius for the 3D scene
const SATELLITE_ORBIT_SCALE_FACTOR = 1 / 1000; // Scales satellite ECI coordinates (km to scene units)
const SATELLITE_VISUAL_SIZE = 0.05; // Visual size of satellite spheres in scene units
const CONE_VISUAL_SCALE_FACTOR = 0.1; // Scales cone length
const CONE_VISUAL_HEIGHT = 1.5; // Visual height of the cone in scene units
const CONE_RADIAL_SEGMENTS = 16; // Fewer segments for performance
const LABEL_OFFSET_Y = 0.1; // Offset for labels above satellites
const LABEL_FONT_SIZE = 0.07;

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
}) => {
    const { beaconTrack, iridiumTracks, handshakeLog, activeLinksLog } = results || {};
    const hasSimulationData = !!(results && beaconTrack && beaconTrack.length > 0 && iridiumTracks);

    // Load Earth texture
    const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth_texture.jpg');

    // Memoize Geometries and Materials
    const earthGeometry = useMemo(() => new THREE.SphereGeometry(EARTH_RADIUS_KM_3D, 32, 32), []);
    const earthMaterial = useMemo(() => new THREE.MeshStandardMaterial({ map: earthTexture }), [earthTexture]);

    const satelliteGeometry = useMemo(() => new THREE.SphereGeometry(SATELLITE_VISUAL_SIZE, 16, 16), []);
    // Base materials
    const baseBeaconMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'orange' }), []);
    const baseIridiumMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'lightblue' }), []);
    // Highlight material (e.g., emissive yellow)
    const highlightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'yellow', emissive: 'yellow', emissiveIntensity: 0.7 }), []);

    const beaconConeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'gold', transparent: true, opacity: 0.3 }), []);
    const iridiumConeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: 'cyan', transparent: true, opacity: 0.3 }), []);

    // Placeholder for 3D objects refs if needed later
    // const earthRef = useRef<THREE.Mesh>(null!);
    // const beaconRef = useRef<THREE.Mesh>(null!);
    // const iridiumRefs = useRef<Record<string, THREE.Mesh>>({});

    // Calculate satellite positions for the current time index
    const currentBeaconSat = hasSimulationData ? beaconTrack?.[currentTimeIndex] : null;
    let beaconDisplayPosition: THREE.Vector3 | null = null;
    if (currentBeaconSat?.positionEci) {
        beaconDisplayPosition = new THREE.Vector3(
            currentBeaconSat.positionEci.x * SATELLITE_ORBIT_SCALE_FACTOR,
            currentBeaconSat.positionEci.z * SATELLITE_ORBIT_SCALE_FACTOR, // ECI Z maps to Three.js Y (up)
            -currentBeaconSat.positionEci.y * SATELLITE_ORBIT_SCALE_FACTOR  // ECI Y maps to negative Three.js Z (towards camera for right-handed system)
        );
    }

    const iridiumDisplayPositions = useMemo(() => {
        if (!hasSimulationData || !iridiumTracks) return [];
        return Object.entries(iridiumTracks).map(([satelliteId, track]) => {
            const satPos = track[currentTimeIndex];
            if (satPos?.positionEci) {
                return {
                    id: satelliteId,
                    position: new THREE.Vector3(
                        satPos.positionEci.x * SATELLITE_ORBIT_SCALE_FACTOR,
                        satPos.positionEci.z * SATELLITE_ORBIT_SCALE_FACTOR,
                        -satPos.positionEci.y * SATELLITE_ORBIT_SCALE_FACTOR
                    )
                };
            }
            return null;
        }).filter(p => p !== null) as { id: string; position: THREE.Vector3 }[];
    }, [iridiumTracks, currentTimeIndex, hasSimulationData]);

    const beaconTrail = useMemo(() => {
        if (!beaconTrack || beaconTrack.length < 2) return null;
        return <OrbitTrail track={beaconTrack} color="orange" scaleFactor={SATELLITE_ORBIT_SCALE_FACTOR} />;
    }, [beaconTrack]);

    const iridiumTrails = useMemo(() => {
        if (!iridiumTracks) return [];
        return Object.entries(iridiumTracks).map(([id, track]) => {
            if (track.length < 2) return null;
            return <OrbitTrail key={`trail-${id}`} track={track} color="lightblue" scaleFactor={SATELLITE_ORBIT_SCALE_FACTOR} />;
        }).filter(trail => trail !== null);
    }, [iridiumTracks]);

    return (
        <div style={{ height: 'calc(100vh - 250px)', minHeight:'500px', background: '#000' }}> {/* Adjust height as needed */}
            <Canvas camera={{ position: [0, 0, EARTH_RADIUS_KM_3D * 3], fov: 50 }}>
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* Earth - Rendered Unconditionally */}
                <mesh geometry={earthGeometry} material={earthMaterial}>
                    {/* Original sphereGeometry and meshStandardMaterial are now replaced by memoized versions above */}
                </mesh>

                {/* Orbit Trails - Conditionally Rendered */}
                {hasSimulationData && showSatelliteTrails && beaconTrail}
                {hasSimulationData && showSatelliteTrails && iridiumTrails}

                {/* Satellites & Labels - Rendered Conditionally */}
                {hasSimulationData && beaconDisplayPosition && (
                    <group>
                        <mesh 
                            position={beaconDisplayPosition} 
                            geometry={satelliteGeometry} 
                            material={selectedSatelliteId === 'Beacon' ? highlightMaterial : baseBeaconMaterial} 
                            onClick={() => {
                                if (onSatelliteSelect) onSatelliteSelect('Beacon');
                            }}
                        />
                        {showSatelliteLabels && (
                            <Text
                                position={[beaconDisplayPosition.x, beaconDisplayPosition.y + LABEL_OFFSET_Y, beaconDisplayPosition.z]}
                                fontSize={LABEL_FONT_SIZE}
                                color="orange"
                                anchorX="center"
                                anchorY="middle"
                            >
                                Beacon
                            </Text>
                        )}
                    </group>
                )}

                {hasSimulationData && iridiumDisplayPositions.map(sat => {
                    const iridiumSatName = sat.id; 
                    return (
                        <group key={`group-${sat.id}`}>
                            <mesh 
                                key={sat.id} 
                                position={sat.position} 
                                geometry={satelliteGeometry} 
                                material={selectedSatelliteId === sat.id ? highlightMaterial : baseIridiumMaterial} 
                                onClick={() => {
                                    if (onSatelliteSelect) onSatelliteSelect(sat.id);
                                }}
                            />
                            {showSatelliteLabels && (
                                <Text
                                    position={[sat.position.x, sat.position.y + LABEL_OFFSET_Y, sat.position.z]}
                                    fontSize={LABEL_FONT_SIZE}
                                    color="lightblue"
                                    anchorX="center"
                                    anchorY="middle"
                                >
                                    {iridiumSatName.replace('IRIDIUM ', 'I-')}
                                </Text>
                            )}
                        </group>
                    );
                })}

                {/* Communication Cones - Rendered Conditionally */}
                {hasSimulationData && showCommunicationCones && (
                    <>
                        {/* Beacon Cones */}
                        {currentBeaconSat?.positionEci && currentBeaconSat?.velocityEci && beaconFovDeg && (
                            createBeaconAntennaCones(
                                currentBeaconSat.positionEci,
                                currentBeaconSat.velocityEci,
                                THREE.MathUtils.degToRad(beaconFovDeg / 2),
                                'BEACON_3D_CONE'
                            ).map((cone, index) => {
                                const coneTipVec3 = eciToThreeJS(cone.tip, SATELLITE_ORBIT_SCALE_FACTOR);
                                const coneAxisVec3 = eciVecToThreeJSVec(cone.axis);
                                const coneRadius = Math.tan(cone.halfAngle) * CONE_VISUAL_HEIGHT;
                                
                                const coneMesh = new THREE.Mesh();
                                coneMesh.geometry = new THREE.ConeGeometry(coneRadius, CONE_VISUAL_HEIGHT, CONE_RADIAL_SEGMENTS);
                                coneMesh.position.copy(coneTipVec3);
                                
                                // Align cone: default ConeGeometry points up Y-axis
                                const defaultDir = new THREE.Vector3(0, 1, 0);
                                coneMesh.quaternion.setFromUnitVectors(defaultDir, coneAxisVec3);
                                // Adjust position because cone tip is at its center of base, not apex
                                coneMesh.translateY(-CONE_VISUAL_HEIGHT / 2);

                                return <primitive key={`beacon-cone-${index}`} object={coneMesh} material={beaconConeMaterial} />;
                            })
                        )}

                        {/* Iridium Cones */}
                        {iridiumFovDeg && iridiumDisplayPositions.map(iridiumSat => {
                            // Find the original Iridium sat data to get ECI for cone generation
                            const originalIridiumSatTrack = iridiumTracks?.[iridiumSat.id]; // Simplified lookup
                            const iridiumEciPos = originalIridiumSatTrack?.[currentTimeIndex]?.positionEci;

                            if (iridiumEciPos) {
                                const iridiumGeometricCone = createIridiumCone(
                                    iridiumEciPos,
                                    THREE.MathUtils.degToRad(iridiumFovDeg / 2),
                                    iridiumSat.id
                                );
                                const coneTipVec3 = eciToThreeJS(iridiumGeometricCone.tip, SATELLITE_ORBIT_SCALE_FACTOR);
                                let coneAxisVec3 = eciVecToThreeJSVec(iridiumGeometricCone.axis);
                                // coneAxisVec3 should point from satellite towards Earth origin.
                                // If it visually points away, negate it.
                                coneAxisVec3 = coneAxisVec3.negate();

                                const coneRadius = Math.tan(iridiumGeometricCone.halfAngle) * CONE_VISUAL_HEIGHT;

                                const coneMesh = new THREE.Mesh();
                                coneMesh.geometry = new THREE.ConeGeometry(coneRadius, CONE_VISUAL_HEIGHT, CONE_RADIAL_SEGMENTS);
                                coneMesh.position.copy(coneTipVec3);
                                const defaultDir = new THREE.Vector3(0, 1, 0);
                                coneMesh.quaternion.setFromUnitVectors(defaultDir, coneAxisVec3);
                                coneMesh.translateY(-CONE_VISUAL_HEIGHT / 2);

                                return <primitive key={`iridium-cone-${iridiumSat.id}`} object={coneMesh} material={iridiumConeMaterial} />;
                            }
                            return null;
                        })}
                    </>
                )}

                <OrbitControls 
                    enableZoom={true} 
                    enablePan={true} 
                    // minDistance={EARTH_RADIUS_KM_3D * 1.1} 
                    // maxDistance={EARTH_RADIUS_KM_3D * 10} 
                />
            </Canvas>
        </div>
    );
};

// Helper to convert ECI {x,y,z} to THREE.Vector3 (x, z, -y)
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

export default SatVisualization3D; 