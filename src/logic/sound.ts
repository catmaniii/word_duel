/**
 * Simple sound synthesizer using Web Audio API for cute UI effects.
 */

// Singleton context, initialized lazily
let audioCtx: AudioContext | null = null;

function getContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

const playTone = (freq: number, type: OscillatorType, duration: number, delay = 0, vol = 0.1) => {
    const ctx = getContext();
    if (!ctx) return;

    // Resume context if suspended (browser requirement for user interaction)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error(e));
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    // Optimized Envelope: Instant attack for clicks/UI
    const attackTime = 0.005; // 5ms attack to avoid click artifacts but feel instant
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.1);
};

// Call this on first user interaction to warm up audio
export const initAudio = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
};

export const playSound = (type: 'click' | 'success' | 'error' | 'delete' | 'start' | 'refresh' | 'shame' | 'victory') => {
    try {
        switch (type) {
            case 'click':
                // Cute "pop" sound
                playTone(800, 'sine', 0.1, 0, 0.1);
                break;
            case 'delete':
                // Lower "loop" sound
                playTone(300, 'sine', 0.1, 0, 0.1);
                break;
            case 'success':
                // Happy ascending major arpeggio
                playTone(523.25, 'sine', 0.1, 0, 0.1); // C5
                playTone(659.25, 'sine', 0.1, 0.1, 0.1); // E5
                playTone(783.99, 'sine', 0.2, 0.2, 0.1); // G5
                break;
            case 'error':
                // Wobbly "uh-oh" sound
                playTone(300, 'sawtooth', 0.15, 0, 0.05);
                playTone(250, 'sawtooth', 0.2, 0.1, 0.05);
                break;
            case 'start':
                // Exciting start chord
                playTone(440, 'triangle', 0.4, 0, 0.1);
                playTone(554, 'triangle', 0.4, 0.05, 0.1);
                playTone(659, 'triangle', 0.6, 0.1, 0.1);
                playTone(880, 'sine', 0.6, 0.1, 0.05); // Sparkle on top
                break;
            case 'refresh':
                // Quick swoosh
                playTone(600, 'sine', 0.1, 0, 0.05);
                playTone(1000, 'sine', 0.2, 0.05, 0.05);
                break;
            case 'shame':
                // Play local "Boo" sound file
                const audio = new Audio('/boo.mp3');
                audio.volume = 0.3;
                audio.play().catch(e => console.error('Boo sound failed', e));
                break;
            case 'victory':
                // Play local "Victory" sound file
                const victoryAudio = new Audio('/victory.mp3');
                victoryAudio.volume = 0.4;
                victoryAudio.play().catch(e => console.error('Victory sound failed', e));
                break;
        }
    } catch (e) {
        console.error('Audio play failed', e);
    }
};
