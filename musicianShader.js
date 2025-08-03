// Musician outline and particle effect shader
import * as THREE from 'three';

// Vertex shader for outline and particles
const vertexShader = `
varying vec2 vUv;
attribute float size;
attribute vec3 customColor;
varying vec3 vColor;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float beatPhase;
uniform float rhythmConsistency;
uniform float beatStrength;

void main() {
    vUv = uv;
    vColor = customColor;
    
    // Calculate position with smoother movement based on audio
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Modulate size based on comprehensive audio parameters
    float beatPulse = smoothstep(0.0, 0.4, beatActive) * sin(beatPhase * 3.14159 * 2.0) * 0.5 + 0.5;
    float sizeModulation = audioIntensity * 0.5 + 0.6 + 
                         beatPulse * 0.3 * beatStrength +
                         sin(time * (2.0 + rhythmConsistency)) * 0.2 * bassIntensity;
    
    // Add synchronized rhythmic movement
    if (beatActive > 0.5) {
        // Pulse outward on beat with audio-reactive intensity
        float beatIntensity = beatActive * beatStrength;
        mvPosition.xyz += normalize(mvPosition.xyz) * sin(beatPhase * 3.14159 * 2.0) * 0.05 * beatIntensity;
    }
    
    // Add swaying motion synchronized to BPM
    mvPosition.x += sin(time * 1.5 + beatPhase * 6.28) * 0.01 * rhythmConsistency;
    
    gl_PointSize = size * sizeModulation * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for musician outline glow effect
const fragmentShader = `
uniform sampler2D map;
uniform vec3 baseColor;
uniform float outlineWidth;
uniform float outlineIntensity;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float highIntensity;
uniform float beatPhase;
uniform float rhythmConsistency;
uniform float beatStrength;
varying vec2 vUv;
varying vec3 vColor;

// Improved noise function for more organic distortion
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // Discard fully transparent pixels immediately
    if (texColor.a < 0.01) {
        discard;
    }
    
    // Calculate distance to edge using alpha channel gradient - IMPROVED EDGE DETECTION
    float distanceToEdge = 0.0;
    if (texColor.a > 0.05 && texColor.a < 0.99) {
        distanceToEdge = 1.0 - abs(0.5 - texColor.a) * 2.0;
    }
    
    // Animate outline width with audio and rhythm metrics - WIDER SPREAD
    float beatPulse = smoothstep(0.0, 0.3, beatActive) * 
                     (sin(beatPhase * 3.14159 * 2.0) * 0.5 + 0.5);
                     
    // Increase the spread distance but reduce intensity
    float animatedWidth = outlineWidth * (
        1.4 + 
        sin(time * (1.5 + rhythmConsistency)) * 0.25 * bassIntensity +
        beatPulse * 0.5 * beatStrength
    );
    
    // Spread glow wider with lower intensity
    float glowStrength = smoothstep(0.0, animatedWidth * 1.5, distanceToEdge) * (outlineIntensity * 0.8);
    
    // Enhanced pulsing based on detected rhythm with reduced intensity
    float pulseFactor = 1.0 + 
                      sin(time * (2.0 + rhythmConsistency * 3.0)) * 0.2 * audioIntensity + 
                      beatPulse * 0.3 * beatStrength;
    glowStrength *= pulseFactor;
    
    // Create smoother wave-like distortion in the outline that follows the music's rhythm
    float noiseScale = 2.0 + 3.0 * rhythmConsistency; // More consistent rhythm = sharper patterns
    float waveDistortion = snoise(vec2(vUv.y * 10.0 + time * (1.0 + beatStrength), 
                                      time * 0.5)) * 0.1 * beatActive;
    glowStrength *= (1.0 + waveDistortion);
    
    // Color shift based on audio frequencies with BPM-synchronized transitions
    vec3 shiftedColor = baseColor;
    
    // Use beat phase for smoother, synchronized color transitions
    float bassColorPhase = sin(time * 0.5 + beatPhase * 6.28) * bassIntensity;
    float midColorPhase = cos(time * 0.7 + beatPhase * 3.14) * midIntensity;
    float highColorPhase = sin(time * 0.4 + beatPhase * 9.42) * highIntensity;
    
    // Apply color shifts synchronized to the music's rhythm
    shiftedColor.r = baseColor.r * (1.0 + bassColorPhase * 0.3);
    shiftedColor.g = baseColor.g * (1.0 + midColorPhase * 0.3);
    shiftedColor.b = baseColor.b * (1.0 + highColorPhase * 0.3);
    
    // On beat, add a rhythmic pulse (reduced intensity)
    if (beatActive > 0.6) {
        // Smoother flash that peaks precisely with the beat
        float flashIntensity = beatActive * beatStrength * (1.0 - beatPhase * 2.0);
        flashIntensity = max(0.0, flashIntensity);
        // Reduce flash intensity by 50%
        shiftedColor = mix(shiftedColor, vec3(1.0), flashIntensity * 0.15);
    }
    
    // Mix the texture color with the animated outline glow
    vec4 finalColor = texColor;
    
    // Add the dynamic glow around the edges
    if (glowStrength > 0.0) {
        finalColor = mix(finalColor, vec4(shiftedColor, texColor.a), glowStrength);
    }
    
    gl_FragColor = finalColor;
}
`;

// Particle fragment shader with more fluid effects and better dissipation
const particleFragmentShader = `
uniform vec3 baseColor;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float highIntensity;
uniform float beatPhase;
uniform float rhythmConsistency;
uniform float beatStrength;
varying vec3 vColor;

// Improved noise function for organic particle variation
float noise(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    // Calculate distance from center of point
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard; // Make particles round
    
    // Create a softer edge for better dissipation that responds to rhythm
    float softFactor = 0.25 + 
                     0.1 * sin(time * (1.5 + rhythmConsistency) + vColor.r * 8.0) * bassIntensity +
                     0.05 * sin(beatPhase * 6.28) * beatStrength;
    
    float alpha = smoothstep(softFactor, 0.5, 0.5 - dist);
    
    // Lower opacity for better transparency and wider spread
    alpha *= 0.4; 
    
    // Create a pulsing effect synchronized to the beat phase
    float beatSyncedPulse = 0.5 + 0.5 * sin(beatPhase * 6.28);
    float pulse = 0.6 + 
                0.25 * sin(time * (2.0 + rhythmConsistency) + vColor.g * 6.0) +
                0.15 * beatSyncedPulse * beatStrength;
    
    pulse *= (0.3 + 0.5 * audioIntensity); // More fluid audio influence with reduced intensity
    
    // Add brightness that peaks precisely on beats
    float beatBoost = max(0.0, beatActive * (1.0 - beatPhase * 2.0) * beatStrength);
    
    // Shift colors based on audio frequency bands synchronized to rhythm
    vec3 dynamicColor = vColor;
    
    // Use beat phase for smooth, synchronized color transitions
    float rhythmicColorShift1 = sin(time * 0.4 + beatPhase * 6.28);
    float rhythmicColorShift2 = cos(time * 0.6 + beatPhase * 3.14);
    float rhythmicColorShift3 = sin(time * 0.5 + beatPhase * 9.42);
    
    dynamicColor.r *= 1.0 + rhythmicColorShift1 * 0.3 * bassIntensity;
    dynamicColor.g *= 1.0 + rhythmicColorShift2 * 0.3 * midIntensity;
    dynamicColor.b *= 1.0 + rhythmicColorShift3 * 0.3 * highIntensity;
    
    // Gentler brightening on beats that follows rhythm
    dynamicColor = mix(dynamicColor, dynamicColor * 1.4, beatBoost * 0.5);
    
    // Add subtle color variation based on noise and rhythm consistency
    float noiseValue = noise(gl_PointCoord * 5.0 + time * rhythmConsistency);
    float colorVariation = sin(time * 1.0 + noiseValue * 6.28) * 0.15;
    dynamicColor = mix(dynamicColor, baseColor, colorVariation);
    
    // Make opacity respond to rhythm and beat phase
    float dynamicAlpha = alpha * pulse * (
        0.4 + 
        bassIntensity * 0.15 + 
        midIntensity * 0.15 +
        beatSyncedPulse * beatStrength * 0.2
    );
    
    // Final color with smoother audio reactivity
    gl_FragColor = vec4(dynamicColor * pulse, dynamicAlpha);
}
`;

class MusicianEffect {
    constructor(musician, baseColor, audioAnalyzer) {
        this.musician = musician;
        this.baseColor = new THREE.Color(baseColor);
        this.audioAnalyzer = audioAnalyzer;
        this.outlineShaderMaterial = null;
        this.particleSystem = null;
        this.audioData = { 
            intensity: 0,
            bassIntensity: 0,
            midIntensity: 0,
            highIntensity: 0,
            beatDetected: false,
            beatPhase: 0,
            rhythmConsistency: 0,
            beatStrength: 0
        };
        
        this.init();
    }
    
    init() {
        // Create the outline glow material with rhythm-reactive uniforms
        this.outlineShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.musician.material.map },
                baseColor: { value: this.baseColor },
                outlineWidth: { value: 0.15 }, // Wider outline for better spread
                outlineIntensity: { value: 0.45 }, // Less intense for less brightness
                time: { value: 0 },
                audioIntensity: { value: 0 },
                beatActive: { value: 0 },
                bassIntensity: { value: 0 },
                midIntensity: { value: 0 },
                highIntensity: { value: 0 },
                beatPhase: { value: 0 },            // Current phase in beat cycle (0-1)
                rhythmConsistency: { value: 0 },    // How consistent is the rhythm
                beatStrength: { value: 0 }          // How strong is the current beat
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.01
        });
        
        // Store original material
        this.originalMaterial = this.musician.material;
        
        // Apply the shader material
        this.musician.material = this.outlineShaderMaterial;
        
        // Create particles behind the musician
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        // More particles for a wider spread effect
        const particleCount = 1500;
        const particleGeometry = new THREE.BufferGeometry();
        
        // Get musician dimensions
        const width = this.musician.geometry.parameters.width;
        const height = this.musician.geometry.parameters.height;
        
        // Create initial empty positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Distribution parameters for better surrounding effect - increase spread
        const edgeEmitProbability = 0.7;  // 70% of particles from edges
        const centralEmitProbability = 0.3; // 30% from center area
        
        // Set initial values - position particles further behind the musician 
        for (let i = 0; i < particleCount; i++) {
            // Determine if this particle emits from edge or center
            const isEdgeParticle = Math.random() < edgeEmitProbability;
            
            let x, y;
            
            if (isEdgeParticle) {
                // Position around the outline with wider distribution
                const angle = Math.random() * Math.PI * 2;
                
                // More varied distance from edge for wider spread
                const radius = width * (0.4 + Math.random() * 0.25);
                
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * (height / width); // Adjust for height
                
                // Adjust y to be more within the height bounds
                y = Math.max(-height/2, Math.min(height/2, y));
            } else {
                // Some particles throughout the musician's body
                x = (Math.random() - 0.5) * width * 0.8;
                y = (Math.random() - 0.5) * height * 0.8;
            }
            
            // Position relative to the musician's center, much further behind for better depth effect
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = -0.6 - Math.random() * 0.3; // Much further behind for better separation
            
            // More subtle color variation based on position
            const positionFactor = Math.sqrt(x*x + y*y) / (width/2);
            colors[i * 3] = this.baseColor.r * (0.85 + positionFactor * 0.15);
            colors[i * 3 + 1] = this.baseColor.g * (0.85 + positionFactor * 0.15);
            colors[i * 3 + 2] = this.baseColor.b * (0.85 + positionFactor * 0.15);
            
            // Smaller particle sizes for a more subtle, distributed effect
            sizes[i] = Math.random() * 2.5 + 0.8;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Enhanced particle material with rhythm-reactive uniforms
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                baseColor: { value: this.baseColor },
                time: { value: 0 },
                audioIntensity: { value: 0 },
                beatActive: { value: 0 },
                bassIntensity: { value: 0 },
                midIntensity: { value: 0 },
                highIntensity: { value: 0 },
                beatPhase: { value: 0 },
                rhythmConsistency: { value: 0 },
                beatStrength: { value: 0 }
            },
            vertexShader: vertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create the particle system
        this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.particleSystem.userData = { 
            particleVelocities: new Float32Array(particleCount * 3),
            particleLifetimes: new Float32Array(particleCount),
            particleEnergies: new Float32Array(particleCount),
            emitPositions: new Float32Array(particleCount * 3), // Original emitter points
            particlePhases: new Float32Array(particleCount),    // Unique phase for each particle
            beatSyncFactors: new Float32Array(particleCount)    // How much each particle syncs to beat
        };
        
        // Set initial velocities, lifetimes, and other parameters
        for (let i = 0; i < particleCount; i++) {
            // Store original position as emission point
            this.particleSystem.userData.emitPositions[i * 3] = positions[i * 3];
            this.particleSystem.userData.emitPositions[i * 3 + 1] = positions[i * 3 + 1];
            this.particleSystem.userData.emitPositions[i * 3 + 2] = positions[i * 3 + 2];
            
            // More gentle but varied velocities for fluid movement
            // Radiate outward from the musician
            const dx = positions[i * 3];
            const dy = positions[i * 3 + 1];
            const distFromCenter = Math.sqrt(dx*dx + dy*dy);
            
            if (distFromCenter > 0) {
                // Normalize direction vector
                const dirX = dx / distFromCenter;
                const dirY = dy / distFromCenter;
                
                // Faster outward movement for wider spread
                this.particleSystem.userData.particleVelocities[i * 3] = dirX * 0.03 * (0.5 + Math.random() * 0.7);
                this.particleSystem.userData.particleVelocities[i * 3 + 1] = dirY * 0.03 * (0.5 + Math.random() * 0.7);
            } else {
                // Random direction for central particles
                const angle = Math.random() * Math.PI * 2;
                this.particleSystem.userData.particleVelocities[i * 3] = Math.cos(angle) * 0.03;
                this.particleSystem.userData.particleVelocities[i * 3 + 1] = Math.sin(angle) * 0.03;
            }
            
            // Add slight upward drift
            this.particleSystem.userData.particleVelocities[i * 3 + 1] += 0.01 + Math.random() * 0.01;
            
            // Z velocity (away from musician)
            this.particleSystem.userData.particleVelocities[i * 3 + 2] = -0.015 - Math.random() * 0.01;
            
            // Longer lifetimes for wider spread
            this.particleSystem.userData.particleLifetimes[i] = Math.random() * 4 + 3.0;
            
            // Energy level - for particle animation
            this.particleSystem.userData.particleEnergies[i] = Math.random();
            
            // Unique phase offset for each particle
            this.particleSystem.userData.particlePhases[i] = Math.random() * Math.PI * 2;
            
            // How much this particle syncs to the beat (0-1)
            this.particleSystem.userData.beatSyncFactors[i] = Math.random() * 0.8 + 0.2;
        }
        
        // Add particle system as a child of the musician to inherit its position and orientation
        this.musician.add(this.particleSystem);
    }
    
    update(time, audioData) {
        // Update audio data with enhanced rhythm metrics
        this.audioData = audioData;
        
        // Smooth audio response for more fluid effects
        const smoothedAudio = {
            intensity: audioData.intensity * 1.2,
            bassIntensity: audioData.bassIntensity * 1.2,
            midIntensity: audioData.midIntensity * 1.2,
            highIntensity: audioData.highIntensity * 1.2,
            beatDetected: audioData.beatDetected,
            beatConfidence: audioData.beatConfidence || 0,
            beatPhase: audioData.beatPhase || 0,
            rhythmConsistency: audioData.rhythmConsistency || 0.5,
            beatStrength: audioData.beatStrength || 0
        };
        
        // Update outline shader uniforms with rhythm-synchronized values
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.uniforms.time.value = time;
            this.outlineShaderMaterial.uniforms.audioIntensity.value = smoothedAudio.intensity;
            this.outlineShaderMaterial.uniforms.beatActive.value = smoothedAudio.beatDetected ? 
                smoothedAudio.beatConfidence : 0.0;
            this.outlineShaderMaterial.uniforms.bassIntensity.value = smoothedAudio.bassIntensity;
            this.outlineShaderMaterial.uniforms.midIntensity.value = smoothedAudio.midIntensity;
            this.outlineShaderMaterial.uniforms.highIntensity.value = smoothedAudio.highIntensity;
            this.outlineShaderMaterial.uniforms.beatPhase.value = smoothedAudio.beatPhase;
            this.outlineShaderMaterial.uniforms.rhythmConsistency.value = smoothedAudio.rhythmConsistency;
            this.outlineShaderMaterial.uniforms.beatStrength.value = smoothedAudio.beatStrength;
            
            // Dynamic outline properties that react to the rhythm - reduced intensity
            const beatFactor = smoothedAudio.beatDetected ? 
                smoothedAudio.beatConfidence * (1.0 - smoothedAudio.beatPhase * 1.5) : 0;
            
            this.outlineShaderMaterial.uniforms.outlineIntensity.value = 
                0.45 + smoothedAudio.bassIntensity * 0.3 + beatFactor * 0.3;
                
            this.outlineShaderMaterial.uniforms.outlineWidth.value = 
                0.15 + smoothedAudio.midIntensity * 0.08 + beatFactor * 0.07;
        }
        
        // Update particle system with rhythm-synchronized values
        if (this.particleSystem) {
            // Update uniforms with rhythm-aware audio data
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.material.uniforms.audioIntensity.value = smoothedAudio.intensity;
            this.particleSystem.material.uniforms.beatActive.value = smoothedAudio.beatDetected ? 
                smoothedAudio.beatConfidence : 0.0;
            this.particleSystem.material.uniforms.bassIntensity.value = smoothedAudio.bassIntensity;
            this.particleSystem.material.uniforms.midIntensity.value = smoothedAudio.midIntensity;
            this.particleSystem.material.uniforms.highIntensity.value = smoothedAudio.highIntensity;
            this.particleSystem.material.uniforms.beatPhase.value = smoothedAudio.beatPhase;
            this.particleSystem.material.uniforms.rhythmConsistency.value = smoothedAudio.rhythmConsistency;
            this.particleSystem.material.uniforms.beatStrength.value = smoothedAudio.beatStrength;
            
            // Update particle positions and lifetimes with rhythm-aware behaviors
            const positions = this.particleSystem.geometry.attributes.position.array;
            const sizes = this.particleSystem.geometry.attributes.size.array;
            const colors = this.particleSystem.geometry.attributes.customColor.array;
            const velocities = this.particleSystem.userData.particleVelocities;
            const lifetimes = this.particleSystem.userData.particleLifetimes;
            const energies = this.particleSystem.userData.particleEnergies;
            const emitPositions = this.particleSystem.userData.emitPositions;
            const particlePhases = this.particleSystem.userData.particlePhases;
            const beatSyncFactors = this.particleSystem.userData.beatSyncFactors;
            
            // Get musician dimensions for respawning particles
            const width = this.musician.geometry.parameters.width;
            const height = this.musician.geometry.parameters.height;
            
            // Calculate BPM-aware decay rate
            const bpmDecayMultiplier = smoothedAudio.rhythmConsistency > 0.1 ? 
                1.0 + (smoothedAudio.beatPhase * 0.5) : 1.0;
            
            for (let i = 0; i < positions.length / 3; i++) {
                // Update lifetime with rhythm-aware decay - slower decay for wider spread
                const lifetimeDecay = 0.008 * (1.0 + smoothedAudio.intensity * 0.2) * bpmDecayMultiplier;
                lifetimes[i] -= lifetimeDecay; 
                
                // If particle died or moved too far, respawn it
                const dx = positions[i * 3] - emitPositions[i * 3];
                const dy = positions[i * 3 + 1] - emitPositions[i * 3 + 1];
                const dz = positions[i * 3 + 2] - emitPositions[i * 3 + 2];
                const distFromEmit = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (lifetimes[i] <= 0 || distFromEmit > width * 2.5) { // Increased distance threshold
                    // Determine when to emit - more emissions on beat
                    let shouldEmit = true;
                    if (smoothedAudio.rhythmConsistency > 0.4) {
                        // With consistent rhythm, time emissions to the beat
                        shouldEmit = Math.random() < (0.05 + 
                            smoothedAudio.beatPhase < 0.2 ? 0.2 : 0.05);
                    }
                    
                    if (shouldEmit) {
                        // Return to original emit position with some variation for better spread
                        positions[i * 3] = emitPositions[i * 3] + (Math.random() - 0.5) * 0.2;
                        positions[i * 3 + 1] = emitPositions[i * 3 + 1] + (Math.random() - 0.5) * 0.2;
                        positions[i * 3 + 2] = emitPositions[i * 3 + 2] - Math.random() * 0.2; // More depth variation
                        
                        // Reset with rhythm-aware velocity
                        const emitSpeedMultiplier = 1.0 + 
                            smoothedAudio.intensity * 0.5 + 
                            (smoothedAudio.beatDetected ? 
                                smoothedAudio.beatConfidence * 0.5 : 0);
                        
                        // Calculate movement direction away from center
                        const dx = positions[i * 3];
                        const dy = positions[i * 3 + 1];
                        const distFromCenter = Math.sqrt(dx*dx + dy*dy);
                        
                        if (distFromCenter > 0) {
                            // Normalized direction vector
                            const dirX = dx / distFromCenter;
                            const dirY = dy / distFromCenter;
                            
                            // Faster base velocity for wider spread
                            velocities[i * 3] = dirX * 0.03 * emitSpeedMultiplier;
                            velocities[i * 3 + 1] = dirY * 0.03 * emitSpeedMultiplier;
                        } else {
                            // Random direction for central particles
                            const angle = Math.random() * Math.PI * 2;
                            velocities[i * 3] = Math.cos(angle) * 0.03 * emitSpeedMultiplier;
                            velocities[i * 3 + 1] = Math.sin(angle) * 0.03 * emitSpeedMultiplier;
                        }
                        
                        // Add slight upward drift
                        velocities[i * 3 + 1] += 0.01 * emitSpeedMultiplier;
                        
                        // Z velocity (away from musician) - faster for wider spread
                        velocities[i * 3 + 2] = -0.015 * emitSpeedMultiplier;
                        
                        // Longer lifetime for particles for further travel
                        const lifetimeMultiplier = 1.0 + 
                            (smoothedAudio.beatDetected ? smoothedAudio.beatConfidence : 0.0);
                        lifetimes[i] = (3.0 + Math.random() * 2.0) * lifetimeMultiplier;
                        
                        // Smaller particles for less concentration of brightness
                        const sizeMultiplier = 0.8 + 
                            smoothedAudio.intensity * 0.3 + 
                            (smoothedAudio.beatDetected ? smoothedAudio.beatConfidence * 0.5 : 0.0);
                        sizes[i] = (0.8 + Math.random() * 1.8) * sizeMultiplier;
                        
                        // Energy level - for particle animation
                        energies[i] = 0.2 + Math.random() * 0.8;
                        
                        // Refresh phase offset
                        particlePhases[i] = Math.random() * Math.PI * 2;
                        
                        // How much this particle syncs to the beat
                        beatSyncFactors[i] = Math.random() * 0.8 + 0.2;
                        
                        // Color with slight variation - more subdued
                        const colorIntensity = 0.9 + (smoothedAudio.beatDetected ? 
                            smoothedAudio.beatConfidence * 0.2 : 0.0);
                        colors[i * 3] = this.baseColor.r * (0.85 + Math.random() * 0.15) * colorIntensity;
                        colors[i * 3 + 1] = this.baseColor.g * (0.85 + Math.random() * 0.15) * colorIntensity;
                        colors[i * 3 + 2] = this.baseColor.b * (0.85 + Math.random() * 0.15) * colorIntensity;
                    }
                } else {
                    // Update existing particle with rhythm-aware movement
                    
                    // Base movement - faster for wider spread
                    positions[i * 3] += velocities[i * 3] * (1.0 + energies[i] * 0.5);
                    positions[i * 3 + 1] += velocities[i * 3 + 1] * (1.0 + energies[i] * 0.5);
                    positions[i * 3 + 2] += velocities[i * 3 + 2] * (1.0 + energies[i] * 0.5);
                    
                    // Add rhythm-synchronized swirl
                    const swirlingBeatFactor = smoothedAudio.rhythmConsistency > 0.3 ?
                        0.3 + Math.sin(smoothedAudio.beatPhase * Math.PI * 2 + particlePhases[i]) * 0.2 : 0.3;
                    
                    const swirl = 0.002 * smoothedAudio.midIntensity * swirlingBeatFactor; // Reduced swirl
                    const distance = Math.sqrt(positions[i * 3] * positions[i * 3] + 
                                            positions[i * 3 + 1] * positions[i * 3 + 1]);
                    
                    if (distance > 0.2) {
                        velocities[i * 3] += -positions[i * 3 + 1] * swirl / distance;
                        velocities[i * 3 + 1] += positions[i * 3] * swirl / distance;
                    }
                    
                    // Apply gentle floating upward (add beat-synchronized pulses)
                    const beatPulse = smoothedAudio.beatDetected ? 
                        Math.max(0, 1.0 - smoothedAudio.beatPhase * 2.0) * 
                        smoothedAudio.beatConfidence * 0.02 * beatSyncFactors[i] : 0;
                    
                    velocities[i * 3 + 1] += 0.001 + beatPulse; // Increased upward drift
                    
                    // Add more z-distance over time for better depth
                    velocities[i * 3 + 2] -= 0.0005 * (1.0 + smoothedAudio.bassIntensity * 0.5);
                    
                    // Improved radial dispersion - particles spread more with rhythm
                    const outwardForceFactor = 0.0006 * (1.0 + 
                        smoothedAudio.bassIntensity * 0.5 + 
                        (smoothedAudio.beatDetected ? smoothedAudio.beatConfidence * 0.5 : 0));
                    
                    if (distance < width * 0.8) {
                        // Push particles outward proportional to distance - increased force
                        const pushForce = outwardForceFactor * (0.9 - distance/(width * 0.8));
                        
                        if (positions[i * 3] !== 0) {
                            const dirX = positions[i * 3] / Math.abs(positions[i * 3]);
                            velocities[i * 3] += dirX * pushForce;
                        }
                        
                        if (positions[i * 3 + 1] !== 0) {
                            const dirY = positions[i * 3 + 1] / Math.abs(positions[i * 3 + 1]);
                            velocities[i * 3 + 1] += dirY * pushForce;
                        }
                    }
                    
                    // Slower velocity damping for longer travel distance
                    velocities[i * 3] *= 0.996;
                    velocities[i * 3 + 1] *= 0.996;
                    velocities[i * 3 + 2] *= 0.996;
                    
                    // Add beat-synchronized bursts of movement
                    if (smoothedAudio.beatDetected) {
                        const beatImpulse = smoothedAudio.beatConfidence * beatSyncFactors[i];
                        const beatPhaseImpulse = Math.max(0, 0.5 - smoothedAudio.beatPhase);
                        
                        velocities[i * 3] += (Math.random() - 0.5) * 0.02 * beatImpulse * beatPhaseImpulse;
                        velocities[i * 3 + 1] += Math.random() * 0.025 * beatImpulse * beatPhaseImpulse;
                        velocities[i * 3 + 2] += (Math.random() - 0.5) * 0.015 * beatImpulse * beatPhaseImpulse;
                        
                        // Subtle size pulse on beat
                        sizes[i] *= 1.0 + 0.08 * beatImpulse * beatPhaseImpulse; // Reduced size pulse
                    }
                    
                    // Size reduction based on lifetime and distance - slower reduction
                    const lifeProgress = 1.0 - (lifetimes[i] / 5.0); // Assumes max lifetime is around 5
                    sizes[i] *= 0.998 - lifeProgress * 0.0008;
                    
                    // Fade out particles as they get further from musician and age - slower fade at greater distances
                    const distanceFadeThreshold = width * 1.2; // Increased threshold
                    if (distance > distanceFadeThreshold) {
                        const fadeRatio = (distance - distanceFadeThreshold) / (width * 1.0);
                        lifetimes[i] -= 0.007 * fadeRatio * (1.0 + smoothedAudio.intensity * 0.3);
                    }
                    
                    // Apply z-distance-based fadeout - slower for longer visible distance
                    const zDistance = Math.abs(positions[i * 3 + 2] - emitPositions[i * 3 + 2]);
                    if (zDistance > 1.5) { // Increased threshold
                        lifetimes[i] -= 0.006 * ((zDistance - 1.5) / 1.5);
                    }
                    
                    // Color shift with rhythm
                    if (smoothedAudio.rhythmConsistency > 0.3) {
                        // Smoother color transitions when rhythm is consistent
                        const rhythmicFactor = 0.004 * smoothedAudio.intensity; // Reduced factor
                        
                        colors[i * 3] += Math.sin(time + particlePhases[i] + 
                                                smoothedAudio.beatPhase * 6.28) * 
                                        rhythmicFactor * smoothedAudio.bassIntensity;
                        
                        colors[i * 3 + 1] += Math.sin(time * 1.1 + particlePhases[i] + 
                                                    smoothedAudio.beatPhase * 3.14) * 
                                            rhythmicFactor * smoothedAudio.midIntensity;
                        
                        colors[i * 3 + 2] += Math.sin(time * 0.9 + particlePhases[i] + 
                                                    smoothedAudio.beatPhase * 9.42) * 
                                            rhythmicFactor * smoothedAudio.highIntensity;
                    } else {
                        // More random color shifts when rhythm is less defined
                        const randomFactor = 0.002 * smoothedAudio.intensity; // Reduced factor
                        colors[i * 3] += (Math.random() * 2 - 1) * randomFactor;
                        colors[i * 3 + 1] += (Math.random() * 2 - 1) * randomFactor;
                        colors[i * 3 + 2] += (Math.random() * 2 - 1) * randomFactor;
                    }
                    
                    // Keep colors within reasonable range
                    colors[i * 3] = Math.max(0, Math.min(1, colors[i * 3]));
                    colors[i * 3 + 1] = Math.max(0, Math.min(1, colors[i * 3 + 1]));
                    colors[i * 3 + 2] = Math.max(0, Math.min(1, colors[i * 3 + 2]));
                }
            }
            
            // Update the geometry
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.geometry.attributes.size.needsUpdate = true;
            this.particleSystem.geometry.attributes.customColor.needsUpdate = true;
        }
    }
    
    // Clean up resources
    dispose() {
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.dispose();
        }
        
        if (this.particleSystem) {
            this.musician.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        
        // Restore original material
        if (this.originalMaterial) {
            this.musician.material = this.originalMaterial;
        }
    }
}

export { MusicianEffect };