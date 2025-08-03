// Advanced audio analyzer with beat detection and rhythm analysis
class AudioAnalyzer {
    constructor(audioElement, fftSize = 1024) {
        this.audioElement = audioElement;
        this.fftSize = fftSize;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.initialized = false;
        
        // Enhanced beat detection properties
        this.beatDetector = {
            threshold: 0.15,
            decayRate: 0.98,
            frameCount: 0,
            currentVolume: 0,
            lastVolume: 0,
            beatCutOff: 0,
            beatDetected: false,
            beatHistory: [],           // Store recent beat timings
            beatConfidence: 0,         // How confident we are in the beat detection
            lastBeatTime: 0,           // Last time a beat was detected
            bpm: 0,                    // Estimated beats per minute
            beatTimes: [],             // Array of recent beat times for BPM calculation
            beatPhase: 0               // Current phase in the beat cycle (0 to 1)
        };
        
        // Band energy levels with more detailed frequency ranges
        this.energyBands = {
            subBass: { min: 0, max: 5, value: 0 },      // 20-60Hz
            bass: { min: 5, max: 20, value: 0 },        // 60-250Hz
            lowMid: { min: 20, max: 40, value: 0 },     // 250-500Hz
            mid: { min: 40, max: 80, value: 0 },        // 500-2kHz
            highMid: { min: 80, max: 160, value: 0 },   // 2-4kHz
            high: { min: 160, max: 300, value: 0 },     // 4-12kHz
            veryHigh: { min: 300, max: 511, value: 0 }  // 12-20kHz
        };
        
        // Energy smoothing for more fluid transitions
        this.energyHistory = {
            subBass: [0, 0, 0, 0, 0],
            bass: [0, 0, 0, 0, 0],
            lowMid: [0, 0, 0, 0, 0],
            mid: [0, 0, 0, 0, 0],
            highMid: [0, 0, 0, 0, 0],
            high: [0, 0, 0, 0, 0],
            veryHigh: [0, 0, 0, 0, 0]
        };
        
        // Rhythm analysis properties
        this.rhythmAnalysis = {
            energyChange: 0,          // Rate of energy change
            rhythmConsistency: 0,     // How consistent is the rhythm
            beatStrength: 0,          // How strong is the current beat
            lastBeatProgress: 0       // Progress through beat cycle (0-1)
        };
        
        // For BPM detection
        this.bpmDetection = {
            minBPM: 60,
            maxBPM: 200,
            timeWindow: 5,            // Analyze last 5 seconds
            beatMargin: 0.05          // 50ms margin for beat detection
        };
    }
    
    init() {
        if (this.initialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaElementSource(this.audioElement);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.82; // Higher value for smoother transitions
        
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        this.initialized = true;
    }
    
    update() {
        if (!this.initialized || !this.audioElement.played.length) {
            return {
                intensity: 0,
                subBassIntensity: 0,
                bassIntensity: 0,
                lowMidIntensity: 0,
                midIntensity: 0,
                highMidIntensity: 0,
                highIntensity: 0,
                veryHighIntensity: 0,
                beatDetected: false,
                beatConfidence: 0,
                bpm: 0,
                beatPhase: 0,
                rhythmConsistency: 0,
                beatStrength: 0,
                energyChange: 0,
                frequencyBinCount: new Uint8Array(0)
            };
        }
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Process frequency bands with enhanced precision
        this._processBands();
        
        // Advanced beat detection with improved accuracy
        this._detectBeats();
        
        // Calculate BPM from beat history
        this._calculateBPM();
        
        // Analyze rhythm patterns
        this._analyzeRhythm();
        
        // Calculate overall intensity with weighted contribution from multiple bands
        const overallIntensity = (
            this.energyBands.subBass.value * 0.15 + 
            this.energyBands.bass.value * 0.25 + 
            this.energyBands.lowMid.value * 0.2 + 
            this.energyBands.mid.value * 0.2 + 
            this.energyBands.highMid.value * 0.1 + 
            this.energyBands.high.value * 0.05 +
            this.energyBands.veryHigh.value * 0.05
        );
        
        return {
            intensity: overallIntensity,
            subBassIntensity: this.energyBands.subBass.value,
            bassIntensity: this.energyBands.bass.value,
            lowMidIntensity: this.energyBands.lowMid.value,
            midIntensity: this.energyBands.mid.value,
            highMidIntensity: this.energyBands.highMid.value,
            highIntensity: this.energyBands.high.value,
            veryHighIntensity: this.energyBands.veryHigh.value,
            beatDetected: this.beatDetector.beatDetected,
            beatConfidence: this.beatDetector.beatConfidence,
            bpm: this.beatDetector.bpm,
            beatPhase: this.beatDetector.beatPhase,
            rhythmConsistency: this.rhythmAnalysis.rhythmConsistency,
            beatStrength: this.rhythmAnalysis.beatStrength,
            energyChange: this.rhythmAnalysis.energyChange,
            frequencyBinCount: this.dataArray
        };
    }
    
    _processBands() {
        // Process each frequency band with smoothing
        for (const band in this.energyBands) {
            const bandData = this.energyBands[band];
            let sum = 0;
            
            // Sum up energy in the band range
            for (let i = bandData.min; i < bandData.max; i++) {
                sum += this.dataArray[i];
            }
            
            // Normalize to 0-1 range
            const count = bandData.max - bandData.min;
            const rawValue = count > 0 ? sum / (count * 255) : 0;
            
            // Update energy history for this band
            this.energyHistory[band].shift();
            this.energyHistory[band].push(rawValue);
            
            // Apply smoothing for more fluid transitions - weighted average
            let smoothedValue = 0;
            const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // More weight to recent values
            
            for (let i = 0; i < this.energyHistory[band].length; i++) {
                smoothedValue += this.energyHistory[band][i] * weights[i];
            }
            
            // Apply additional exponential smoothing for non-linear response
            // This makes louder parts stand out more while keeping quieter parts gentle
            smoothedValue = Math.pow(smoothedValue, 1.3);
            
            bandData.value = smoothedValue;
        }
    }
    
    _detectBeats() {
        this.beatDetector.frameCount++;
        const now = this.audioContext.currentTime;
        
        // Calculate current volume from bass and sub-bass frequencies
        // Weight the sub-bass more heavily for kick drum detection
        const subBassWeight = 0.7;
        const bassWeight = 0.3;
        const combinedBassValue = 
            this.energyBands.subBass.value * subBassWeight +
            this.energyBands.bass.value * bassWeight;
        
        this.beatDetector.currentVolume = combinedBassValue;
        
        // Calculate rate of change in volume for transient detection
        const volumeChange = this.beatDetector.currentVolume - this.beatDetector.lastVolume;
        
        // More comprehensive beat detection algorithm combining multiple approaches:
        // 1. Volume threshold
        // 2. Energy flux (rate of change)
        // 3. Previous beat timing prediction
        
        // Reset beat detection
        this.beatDetector.beatDetected = false;
        
        // Dynamic threshold based on recent audio history
        const dynamicThreshold = this.beatDetector.threshold * 
            (1 + this.energyBands.mid.value * 0.2); // Adjust threshold based on overall energy
        
        // Conditions for beat detection:
        const volumeCondition = this.beatDetector.currentVolume > this.beatDetector.beatCutOff && 
                               this.beatDetector.currentVolume > dynamicThreshold;
        
        // Beat prediction - is this close to when we expect the next beat?
        let predictionConfidence = 0;
        if (this.beatDetector.bpm > 0 && this.beatDetector.lastBeatTime > 0) {
            const expectedBeatInterval = 60 / this.beatDetector.bpm; // in seconds
            const timeSinceLastBeat = now - this.beatDetector.lastBeatTime;
            const nextExpectedBeat = this.beatDetector.lastBeatTime + expectedBeatInterval;
            const beatMargin = expectedBeatInterval * 0.2; // 20% margin of error
            
            // Calculate how close we are to the predicted next beat time
            if (Math.abs(now - nextExpectedBeat) < beatMargin) {
                predictionConfidence = 1 - (Math.abs(now - nextExpectedBeat) / beatMargin);
            }
        }
        
        // Combine conditions - stronger if prediction aligns with energy spike
        if (volumeCondition || (volumeChange > 0.05 && predictionConfidence > 0.7)) {
            // Beat detected
            this.beatDetector.beatDetected = true;
            this.beatDetector.beatConfidence = Math.min(1, 
                (this.beatDetector.currentVolume / this.beatDetector.threshold) * 0.5 + 
                predictionConfidence * 0.5);
                
            // Update beat cutoff with adaptive threshold
            this.beatDetector.beatCutOff = this.beatDetector.currentVolume * 1.1;
            this.beatDetector.frameCount = 0;
            
            // Record beat time for BPM calculation
            if (now - this.beatDetector.lastBeatTime > 0.2) { // Prevent too fast beats
                this.beatDetector.beatTimes.push(now);
                this.beatDetector.lastBeatTime = now;
                
                // Keep only recent beats for BPM calculation
                const timeWindow = this.bpmDetection.timeWindow;
                while (this.beatDetector.beatTimes.length > 0 && 
                      this.beatDetector.beatTimes[0] < now - timeWindow) {
                    this.beatDetector.beatTimes.shift();
                }
            }
        } else {
            // No beat, decay the cutoff more adaptively
            if (this.beatDetector.frameCount > 20) {
                // Use a more adaptive decay rate based on BPM
                let decayRate = this.beatDetector.decayRate;
                if (this.beatDetector.bpm > 0) {
                    // Slower decay for slower BPM, faster decay for faster BPM
                    decayRate = 0.98 - (this.beatDetector.bpm - 60) / 1000;
                    decayRate = Math.max(0.95, Math.min(0.99, decayRate));
                }
                
                this.beatDetector.beatCutOff *= decayRate;
                this.beatDetector.beatCutOff = Math.max(
                    this.beatDetector.beatCutOff, 
                    this.beatDetector.threshold
                );
            }
        }
        
        // Calculate beat phase - where we are in the current beat cycle (0 to 1)
        if (this.beatDetector.bpm > 0 && this.beatDetector.lastBeatTime > 0) {
            const beatInterval = 60 / this.beatDetector.bpm;
            const timeSinceLastBeat = now - this.beatDetector.lastBeatTime;
            this.beatDetector.beatPhase = (timeSinceLastBeat / beatInterval) % 1;
        }
        
        this.beatDetector.lastVolume = this.beatDetector.currentVolume;
    }
    
    _calculateBPM() {
        const beatTimes = this.beatDetector.beatTimes;
        if (beatTimes.length < 4) {
            // Not enough beats to calculate reliable BPM
            return;
        }
        
        // Calculate intervals between beats
        const intervals = [];
        for (let i = 1; i < beatTimes.length; i++) {
            intervals.push(beatTimes[i] - beatTimes[i-1]);
        }
        
        // Filter out outliers that are too short or too long
        const validIntervals = intervals.filter(interval => 
            interval >= 60 / this.bpmDetection.maxBPM && 
            interval <= 60 / this.bpmDetection.minBPM
        );
        
        if (validIntervals.length < 3) {
            // Not enough valid intervals
            return;
        }
        
        // Calculate average interval
        const avgInterval = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;
        
        // Convert to BPM
        const calculatedBPM = Math.round(60 / avgInterval);
        
        // Smooth BPM changes over time to prevent jumpiness
        if (this.beatDetector.bpm === 0) {
            this.beatDetector.bpm = calculatedBPM;
        } else {
            // Smooth transition to new BPM value
            this.beatDetector.bpm = this.beatDetector.bpm * 0.8 + calculatedBPM * 0.2;
        }
    }
    
    _analyzeRhythm() {
        // Calculate energy change rate for rhythm analysis
        let totalEnergyChange = 0;
        
        for (const band in this.energyHistory) {
            const history = this.energyHistory[band];
            if (history.length >= 2) {
                totalEnergyChange += Math.abs(history[history.length - 1] - history[history.length - 2]);
            }
        }
        
        this.rhythmAnalysis.energyChange = totalEnergyChange / Object.keys(this.energyHistory).length;
        
        // Calculate beat strength based on current bass energy relative to recent average
        const currentBass = this.energyBands.bass.value;
        const recentBassAvg = this.energyHistory.bass.reduce((a, b) => a + b, 0) / 
                             this.energyHistory.bass.length;
        
        this.rhythmAnalysis.beatStrength = currentBass / (recentBassAvg + 0.01);
        
        // Calculate rhythm consistency based on BPM stability
        if (this.beatDetector.beatTimes.length >= 4) {
            // Calculate variance in beat intervals
            const intervals = [];
            for (let i = 1; i < this.beatDetector.beatTimes.length; i++) {
                intervals.push(this.beatDetector.beatTimes[i] - this.beatDetector.beatTimes[i-1]);
            }
            
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            
            // Calculate standard deviation of intervals
            const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / 
                            intervals.length;
            const stdDev = Math.sqrt(variance);
            
            // Convert to rhythm consistency value (0-1)
            // Lower standard deviation means more consistent rhythm
            const maxAcceptableStdDev = 0.1; // 100ms variance is still considered consistent
            this.rhythmAnalysis.rhythmConsistency = 
                Math.max(0, 1 - (stdDev / (avgInterval * maxAcceptableStdDev)));
        } else {
            this.rhythmAnalysis.rhythmConsistency = 0;
        }
    }
}

export { AudioAnalyzer };