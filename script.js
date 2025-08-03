import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { MusicianEffect } from './musicianShader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 10, 50);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2.0, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.shadowMap.enabled = true; 
// renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI / 2;

// Lights
const ambientLight = new THREE.AmbientLight(0x222222); // Dimmer ambient light
scene.add(ambientLight);

// Stage Lighting
const createSpotlight = (color, intensity, position, target) => {
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(...position);
    light.angle = Math.PI / 6;
    light.penumbra = 0.3;
    light.decay = 2;
    light.distance = 30;
    
    if (target) {
        light.target.position.set(...target);
        scene.add(light.target);
    }
    
    scene.add(light);
    return light;
};

// Main spotlights
const spotLights = [
    createSpotlight(0xff0000, 2, [-4, 5, 2], [0, 0, 0]),  
    createSpotlight(0x0000ff, 2, [4, 5, 2], [0, 0, 0]),   
    createSpotlight(0xffffff, 1.5, [0, 5, -2], [0, 0, 0]),  
];

// Musician-specific spotlights
const guitaristSpot = createSpotlight(0xff9900, 3, [3, 5, 0], [2, 0, -1]);
const bassistSpot = createSpotlight(0x0099ff, 3, [-3, 5, 0], [-2, 0, 0]);
const singerSpot = createSpotlight(0xffffff, 0, [0, 5, 1], [0, 1, 0]);
// Update drummer spotlight position and target for center-back position
const drummerSpot = createSpotlight(0x9900ff, 0, [0, 7, -2], [0, 3.5, -2]);
const backupSpot1 = createSpotlight(0xff6699, 0, [-4, 5, 0], [-3.5, 1, 1]);
const backupSpot2 = createSpotlight(0x66ff99, 0, [4, 5, 0], [3.5, 1, 1]);

// Moving lights
const movingLights = [];
for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 5;
    const z = Math.sin(angle) * 5;
    
    const light = createSpotlight(
        new THREE.Color().setHSL(i / 8, 1, 0.5).getHex(),
        1.5,
        [x, 4, z],
        [0, 0, 0]
    );
    movingLights.push(light);
}

// Create stage
const stageGeometry = new THREE.BoxGeometry(12, 0.5, 8);
const textureLoader = new THREE.TextureLoader();
const stageTexture = textureLoader.load('/stage_floor.png');
stageTexture.wrapS = THREE.RepeatWrapping;
stageTexture.wrapT = THREE.RepeatWrapping;
stageTexture.repeat.set(4, 3);
const stageMaterial = new THREE.MeshPhongMaterial({ map: stageTexture }); 
const stage = new THREE.Mesh(stageGeometry, stageMaterial);
stage.position.y = -0.25;
// stage.receiveShadow = true; 
scene.add(stage);

// Create drummer riser (elevated platform)
const riserGeometry = new THREE.BoxGeometry(3, 2.0, 2); // Increased height from 0.5 to 2.0 (4x higher)
const riserMaterial = new THREE.MeshPhongMaterial({ 
    map: stageTexture,
    color: 0x333333, // Slightly darker than main stage
    emissive: 0x111111
});
const drumRiser = new THREE.Mesh(riserGeometry, riserMaterial);
drumRiser.position.set(0, 1.0, -2.5); // Increased Y position to 1.0 (from 0) to account for larger height
scene.add(drumRiser);

// Back wall with lighting effects and curtains
const backWallGeometry = new THREE.BoxGeometry(14, 8, 0.5);
const backdropTexture = textureLoader.load('/stage_backdrop.png');
const backWallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    map: backdropTexture,
    emissive: 0x333333,
    emissiveMap: backdropTexture
});
const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWall.position.set(0, 4, -4);
scene.add(backWall);

const MUSICIAN_PLANE_WIDTH = 1.8;
const MUSICIAN_PLANE_HEIGHT = 3;

// Create singer using textured plane
const createSinger = () => {
    const singerTexture = textureLoader.load('/singer.png');
    const singerMaterial = new THREE.MeshBasicMaterial({
        map: singerTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const singerGeometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH, MUSICIAN_PLANE_HEIGHT);
    const singerMesh = new THREE.Mesh(singerGeometry, singerMaterial);
    singerMesh.position.set(0, MUSICIAN_PLANE_HEIGHT / 2, 0);
    
    // Start singer off-stage (will come in at 27.5 seconds)
    singerMesh.position.x = -15;
    
    scene.add(singerMesh);
    return singerMesh;
};

const singer = createSinger();

// Create backup singers
const createBackupSinger = (imagePath, initialPosition) => {
    const texture = textureLoader.load(imagePath);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH * 0.9, MUSICIAN_PLANE_HEIGHT * 0.9); 
    const backupSinger = new THREE.Mesh(geometry, material);
    
    // Start backup singers off-stage, positioned further back
    // The X position will be updated during animation.
    // The Z position is set here relative to the main singer's plane.
    backupSinger.position.set(-15 + initialPosition[0], (MUSICIAN_PLANE_HEIGHT * 0.9) / 2, initialPosition[2] -1.5); 
    scene.add(backupSinger);
    return backupSinger;
};

// Backup singers - initial positions are for their off-stage starting point.
// Their final animated positions will be further left/right.
// Original X positions were -1.5 and 1.5 relative to center. Let's keep initial relative X the same for the off-stage start.
const backupSinger1 = createBackupSinger('/backup_singer_female.png', [-3.5, 0, 1]); // More left
const backupSinger2 = createBackupSinger('/backup_singer_male.png', [3.5, 0, 1]);  // More right

// Generic function to create a musician plane
const createMusicianPlane = (imagePath, initialPosition, isPlaying = false) => {
    const texture = textureLoader.load(imagePath);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH, MUSICIAN_PLANE_HEIGHT);
    const musician = new THREE.Mesh(geometry, material);
    musician.position.set(initialPosition[0], MUSICIAN_PLANE_HEIGHT / 2, initialPosition[2]);
    musician.userData.isPlaying = isPlaying;
    scene.add(musician);
    return musician;
};

// Guitarist - on-stage from the start and actively playing
const guitarist = createMusicianPlane('/guitarist.png', [2, 0, -1], true);

// Bassist - on-stage from the start and actively playing
const bassist = createMusicianPlane('/bassist.png', [-2, 0, 0], true);

// Drummer - starts off-stage, will be centered and elevated when arrives
const drummer = createMusicianPlane('/drummer.png', [-15, 2.0, -2], false); // Increased initial Y to 2.0 from 0.5

// Audio setup
const audioElement = document.getElementById('music');
let audioAnalyzer;

function setupAudio() {
    audioAnalyzer = new AudioAnalyzer(audioElement);
    audioAnalyzer.init();
}

// Create color palettes for each musician
const musicianColors = {
    guitarist: 0xff9900,    // Orange
    bassist: 0x0099ff,      // Blue
    singer: 0xffffff,       // White
    drummer: 0x9900ff,      // Purple
    backupSinger1: 0xff6699, // Pink
    backupSinger2: 0x66ff99  // Mint green
};

// Musician effects - will be populated once musicians are created
let musicianEffects = [];

// After creating musicians, initialize their effects
function initMusicianEffects() {
    // Clear existing effects if any
    musicianEffects.forEach(effect => effect.dispose());
    musicianEffects = [];
    
    // Create new effects for all musicians
    if (guitarist) {
        musicianEffects.push(new MusicianEffect(guitarist, musicianColors.guitarist, audioAnalyzer));
    }
    
    if (bassist) {
        musicianEffects.push(new MusicianEffect(bassist, musicianColors.bassist, audioAnalyzer));
    }
    
    if (singer) {
        musicianEffects.push(new MusicianEffect(singer, musicianColors.singer, audioAnalyzer));
    }
    
    if (drummer) {
        musicianEffects.push(new MusicianEffect(drummer, musicianColors.drummer, audioAnalyzer));
    }
    
    if (backupSinger1) {
        musicianEffects.push(new MusicianEffect(backupSinger1, musicianColors.backupSinger1, audioAnalyzer));
    }
    
    if (backupSinger2) {
        musicianEffects.push(new MusicianEffect(backupSinger2, musicianColors.backupSinger2, audioAnalyzer));
    }
}

// Animation variables
let isPlaying = false;
let time = 0;
let currentPlayTime = 0;

// Band members entrance flags - to prevent multiple triggers
let singerEntered = false;
let drummerEntered = false;

// Camera animation sequences - raising all camera Y positions by approximately 0.5 units
const cameraSequences = [
    { startTime: 0, endTime: 10, position: new THREE.Vector3(0, 2.5, 6), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 },
    { startTime: 10, endTime: 17, position: new THREE.Vector3(3, 2.5, 4), lookAt: new THREE.Vector3(2, 1, -1), easing: 0.01 }, // Guitar focus
    { startTime: 17, endTime: 25, position: new THREE.Vector3(-3, 2.5, 4), lookAt: new THREE.Vector3(-2, 1, 0), easing: 0.01 }, // Bass focus
    { startTime: 25, endTime: 27.5, position: new THREE.Vector3(0, 2.0, 5), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, // Wide shot
    { startTime: 27.5, endTime: 40, position: new THREE.Vector3(2, 2.5, 5), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.005 }, // Singer entrance
    { startTime: 40, endTime: 47, position: new THREE.Vector3(-4, 2.5, 3), lookAt: new THREE.Vector3(-3.5, 1, 1), easing: 0.01 }, // Backup singer 1
    { startTime: 47, endTime: 55, position: new THREE.Vector3(4, 2.5, 3), lookAt: new THREE.Vector3(3.5, 1, 1), easing: 0.01 }, // Backup singer 2
    { startTime: 55, endTime: 70, position: new THREE.Vector3(2, 4.5, 1), lookAt: new THREE.Vector3(0, 3.5, -2), easing: 0.005 }, // Drummer entrance
    { startTime: 70, endTime: 80, position: new THREE.Vector3(0, 3.5, 6), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, // Full band
    { startTime: 80, endTime: 90, position: new THREE.Vector3(4, 2.5, 3), lookAt: new THREE.Vector3(2, 1, -1), easing: 0.01 }, // Guitar solo
    { startTime: 90, endTime: 100, position: new THREE.Vector3(-4, 2.5, 3), lookAt: new THREE.Vector3(-2, 1, 0), easing: 0.01 }, // Bass solo
    { startTime: 100, endTime: 110, position: new THREE.Vector3(1, 2.5, 4), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, // Singer close-up
    { startTime: 110, endTime: 120, position: new THREE.Vector3(3, 4.5, 0), lookAt: new THREE.Vector3(0, 3.5, -2), easing: 0.01 }, // Drummer solo
];

// Animation for band member entrances
function animateBandEntrances() {
    currentPlayTime = audioElement.currentTime;
    
    // Lead singer and backup singers enter at 27.5 seconds
    if (currentPlayTime >= 27.5 && !singerEntered) {
        singerEntered = true;
        
        // Fade in singer spotlight
        new TWEEN.Tween(singerSpot)
            .to({ intensity: 4 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Fade in backup singer spotlights
        new TWEEN.Tween(backupSpot1)
            .to({ intensity: 2 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSpot2)
            .to({ intensity: 2 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        // Animate singer coming in from off-stage
        new TWEEN.Tween(singer.position)
            .to({ x: 0 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Animate backup singers to their new wider positions
        new TWEEN.Tween(backupSinger1.position)
            .to({ x: -3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSinger2.position)
            .to({ x: 3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
    
    // Drummer enters at 55 seconds
    if (currentPlayTime >= 55 && !drummerEntered) {
        drummerEntered = true;
        
        // Fade in drummer spotlight
        new TWEEN.Tween(drummerSpot)
            .to({ intensity: 3.5 }, 1500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        // Animate drummer coming in to center position and higher Y position
        new TWEEN.Tween(drummer.position)
            .to({ x: 0, y: MUSICIAN_PLANE_HEIGHT / 2 + 2.0 }, 1500) 
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
}

// Specialized animation function for guitarist and bassist in first 25 seconds
function animateMusiciansFirstSegment(time, bassAvg, midAvg) {
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; 

    // More energetic movements for guitarist and bassist in the first 25 seconds
    if (currentPlayTime < 25) {
        // Guitarist energetic playing
        guitarist.position.y = musicianBaseY + Math.sin(time * 5) * 0.15 * midAvg;
        guitarist.rotation.x = Math.sin(time * 4) * 0.1 * midAvg;
        
        // Bassist movement timed with bass notes
        bassist.position.y = musicianBaseY + Math.sin(time * 3) * 0.12 * bassAvg;
        bassist.rotation.x = Math.sin(time * 2.5) * 0.08 * bassAvg;
        
        // Move camera to focus on guitarist and bassist - raised Y positions
        if (currentPlayTime < 10) {
            camera.position.lerp(new THREE.Vector3(0, 2.5, 6), 0.01);
            camera.lookAt(0, 1, 0);
        } else if (currentPlayTime < 20) {
            camera.position.lerp(new THREE.Vector3(3, 2.5, 4), 0.01);
            camera.lookAt(guitarist.position);
        } else {
            camera.position.lerp(new THREE.Vector3(-3, 2.5, 4), 0.01);
            camera.lookAt(bassist.position);
        }
    } else {
        // Return to default camera position after 25 seconds - raised Y position
        if (currentPlayTime < 27) {
            camera.position.lerp(new THREE.Vector3(0, 2.0, 5), 0.01);
            camera.lookAt(0, 1, 0);
        }
        
        // Regular musician animations after 25 seconds
        guitarist.position.y = musicianBaseY + Math.sin(time * 2) * 0.1 * midAvg;
        bassist.position.y = musicianBaseY + Math.sin(time * 4) * 0.1 * bassAvg;
    }
}

// Camera movement based on current time
function updateCameraPosition() {
    if (!isPlaying) return;
    
    // Find the current sequence based on playback time
    const currentSequence = cameraSequences.find(seq => 
        currentPlayTime >= seq.startTime && currentPlayTime < seq.endTime
    );
    
    // If we've gone past all defined sequences, cycle through band members
    if (!currentSequence && currentPlayTime >= 120) {
        const cycleTime = ((currentPlayTime - 120) % 40); // 10 seconds per band member
        
        if (cycleTime < 10) {
            // Singer - raised Y position
            camera.position.lerp(new THREE.Vector3(0, 2.5, 4), 0.01);
            camera.lookAt(singer.position);
        } else if (cycleTime < 20) {
            // Guitarist - raised Y position
            camera.position.lerp(new THREE.Vector3(3, 2.5, 3), 0.01);
            camera.lookAt(guitarist.position);
        } else if (cycleTime < 30) {
            // Bassist - raised Y position
            camera.position.lerp(new THREE.Vector3(-3, 2.5, 3), 0.01);
            camera.lookAt(bassist.position);
        } else {
            // Drummer - raised Y position
            camera.position.lerp(new THREE.Vector3(2, 4.5, 1), 0.01);
            camera.lookAt(new THREE.Vector3(0, 3.5, -2));
        }
        return;
    }
    
    // Apply camera sequence if found
    if (currentSequence) {
        camera.position.lerp(currentSequence.position, currentSequence.easing);
        camera.lookAt(currentSequence.lookAt);
    }
}

// Light animation with spotlight focus
function animateLights(delta) {
    time += delta;
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; 
    const backupSingerBaseY = (MUSICIAN_PLANE_HEIGHT * 0.9) / 2; 

    // Update spotlight targets to follow musicians
    if (isPlaying) {
        // Update spotlight targets
        guitaristSpot.target.position.copy(guitarist.position);
        bassistSpot.target.position.copy(bassist.position);
        
        if (singerEntered) {
            singerSpot.target.position.copy(singer.position);
            backupSpot1.target.position.copy(backupSinger1.position);
            backupSpot2.target.position.copy(backupSinger2.position);
        }
        
        if (drummerEntered) {
            // Update spotlight to track drummer at new position
            drummerSpot.target.position.copy(drummer.position);
        }
        
        // Strobe effect for moving lights
        if (currentPlayTime > 55) { // After drummer comes in
            movingLights.forEach((light, i) => {
                // More energetic pattern after drummer
                const pulseRate = 0.5 + Math.sin(time * 2) * 0.3;
                light.intensity = 1 + Math.sin(time * 10 + i * 0.5) * pulseRate;
            });
        }
    }

    // Animate moving lights
    movingLights.forEach((light, i) => {
        const angle = time * 0.5 + (i / movingLights.length) * Math.PI * 2;
        const x = Math.cos(angle) * 6;
        const z = Math.sin(angle) * 6;
        light.position.set(x, 4 + Math.sin(time * 2 + i) * 0.5, z);
    });
    
    // Pulse main lights with bass
    if (audioAnalyzer && isPlaying) {
        const audioData = audioAnalyzer.update();
        
        // Get bass and mid intensity directly from audioData
        const bassAvg = audioData.bassIntensity;
        const midAvg = audioData.midIntensity;
        
        // Adjust spotlight intensities based on music and current focus
        spotLights[0].intensity = 2 + bassAvg * 5;
        spotLights[1].intensity = 2 + midAvg * 5;
        
        // Enhancement for musician-specific spotlights
        if (currentPlayTime < 27.5) {
            // First section: focus on guitarist and bassist
            guitaristSpot.intensity = 3 + midAvg * 3;
            bassistSpot.intensity = 3 + bassAvg * 3;
        } else if (currentPlayTime < 55) {
            // Second section: focus on singer and backup singers
            guitaristSpot.intensity = 2 + midAvg * 2;
            bassistSpot.intensity = 2 + bassAvg * 2;
            if (singerEntered) {
                singerSpot.intensity = 4 + midAvg * 4;
                backupSpot1.intensity = 2 + midAvg * 2;
                backupSpot2.intensity = 2 + midAvg * 2;
            }
        } else {
            // After drummer enters
            const timePhase = ((currentPlayTime - 55) % 40) / 40; // 0 to 1 phase over 40 seconds
            
            // Cycle spotlight intensities based on who's in focus
            if (timePhase < 0.25) {
                // Drummer focus
                drummerSpot.intensity = 3.5 + bassAvg * 3;
                guitaristSpot.intensity = 1.5 + midAvg;
                bassistSpot.intensity = 1.5 + bassAvg;
                singerSpot.intensity = 2 + midAvg;
                backupSpot1.intensity = 1 + midAvg * 0.5;
                backupSpot2.intensity = 1 + midAvg * 0.5;
            } else if (timePhase < 0.5) {
                // Singer focus
                drummerSpot.intensity = 2 + bassAvg;
                guitaristSpot.intensity = 2 + midAvg;
                bassistSpot.intensity = 2 + bassAvg;
                singerSpot.intensity = 4 + midAvg * 4;
                backupSpot1.intensity = 2 + midAvg * 1.5;
                backupSpot2.intensity = 2 + midAvg * 1.5;
            } else if (timePhase < 0.75) {
                // Guitarist focus
                drummerSpot.intensity = 2 + bassAvg;
                guitaristSpot.intensity = 3.5 + midAvg * 3;
                bassistSpot.intensity = 1.5 + bassAvg;
                singerSpot.intensity = 2 + midAvg;
                backupSpot1.intensity = 1 + midAvg * 0.5;
                backupSpot2.intensity = 1 + midAvg * 0.5;
            } else {
                // Bassist focus
                drummerSpot.intensity = 2 + bassAvg;
                guitaristSpot.intensity = 1.5 + midAvg;
                bassistSpot.intensity = 3.5 + bassAvg * 3;
                singerSpot.intensity = 2 + midAvg;
                backupSpot1.intensity = 1 + midAvg * 0.5;
                backupSpot2.intensity = 1 + midAvg * 0.5;
            }
        }
        
        // Animate musicians based on timeline
        animateMusiciansFirstSegment(time, bassAvg, midAvg);
        
        // Make singer move slightly with music (only if they're on stage)
        if (singerEntered) {
            singer.position.y = musicianBaseY + Math.sin(time * 3) * 0.1 * midAvg;
            singer.rotation.z = Math.sin(time * 2) * 0.05 * midAvg;
            
            // Backup singers movement
            backupSinger1.position.y = backupSingerBaseY + Math.sin(time * 3 + 0.5) * 0.08 * midAvg; 
            backupSinger1.rotation.z = Math.sin(time * 2 + 0.5) * 0.03 * midAvg;
            backupSinger2.position.y = backupSingerBaseY + Math.sin(time * 3 + 1) * 0.08 * midAvg; 
            backupSinger2.rotation.z = Math.sin(time * 2 + 1) * 0.03 * midAvg;
        }
        
        // Drummer movement (only if on stage)
        if (drummerEntered) {
            drummer.position.y = (MUSICIAN_PLANE_HEIGHT / 2 + 2.0) + Math.sin(time * 8) * 0.15 * bassAvg;
            // Add a bit of rotation for the drummer for more dynamism
            drummer.rotation.y = Math.sin(time * 0.5) * 0.1; 
        }
    }
}

// Update shaders with audio data
function updateShaderEffects(time) {
    if (!audioAnalyzer || !isPlaying) return;
    
    // Get audio analysis data with enhanced rhythm metrics
    const audioData = audioAnalyzer.update();
    
    // Log BPM and rhythm data occasionally for debugging
    if (Math.floor(time) % 5 === 0 && Math.floor(time * 10) % 10 === 0) {
        console.log(`BPM: ${audioData.bpm.toFixed(1)}, Beat Confidence: ${audioData.beatConfidence.toFixed(2)}, Rhythm Consistency: ${audioData.rhythmConsistency.toFixed(2)}`);
    }
    
    // Update each musician effect with enhanced audio data
    musicianEffects.forEach(effect => {
        effect.update(time, audioData);
    });
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    time += delta;
    
    // Update controls - disable controls when music is playing for choreographed camera moves
    if (!isPlaying) {
        controls.update();
    }
    
    // Update TWEEN animations
    TWEEN.update();
    
    // Animate band entrances based on song time
    if (isPlaying) {
        animateBandEntrances();
        updateCameraPosition();
    }
    
    // Animate scene elements
    animateLights(delta);
    
    // Update shader effects
    updateShaderEffects(time);
    
    // Render scene
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Play button event
document.getElementById('playBtn').addEventListener('click', () => {
    if (!isPlaying) {
        if (!audioAnalyzer) {
            setupAudio();
            // Initialize musician effects when play is first clicked
            initMusicianEffects();
        }
        audioElement.play();
        isPlaying = true;
        document.getElementById('playBtn').textContent = '❚❚ PAUSE';
        
        // Disable orbit controls when playing for choreographed camera moves
        controls.enabled = false;
    } else {
        audioElement.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ PLAY MUSIC VIDEO';
        
        // Re-enable orbit controls when paused
        controls.enabled = true;
    }
});

// Initialize
const loading = document.getElementById('loading');

// Hide loading screen when everything is ready
window.addEventListener('load', () => {
    // A small delay to ensure all assets might be starting to load
    setTimeout(() => {
        const allMedia = Array.from(document.querySelectorAll('audio, video, img'));
        let loadedCount = 0;
        const totalMedia = allMedia.length;

        if (totalMedia === 0) {
            hideLoadingScreen();
            return;
        }

        allMedia.forEach(media => {
            if (media.complete || media.readyState >= 2 || media.tagName !== 'IMG' && media.tagName !== 'AUDIO' && media.tagName !== 'VIDEO') { 
                loadedCount++;
                if (loadedCount === totalMedia) hideLoadingScreen();
            } else {
                media.addEventListener('loadeddata', checkAllLoaded); 
                media.addEventListener('load', checkAllLoaded);       
                media.addEventListener('error', checkAllLoaded);      
            }
        });

        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount === totalMedia) {
                hideLoadingScreen();
            }
        }
        
        // Fallback timeout in case some events don't fire
        setTimeout(hideLoadingScreen, 5000);
    }, 500); 
});

function hideLoadingScreen() {
    if (loading.style.opacity !== "0") { 
        loading.style.opacity = 0;
        setTimeout(() => {
            loading.style.display = 'none';
        }, 1000); 
    }
}

// Start animation
animate();