/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export type SoundProfile = "zen" | "beep" | "chime" | "mechanical" | "none";

// Play a dynamic tick sound
export function playTickSound(volume: number = 0.05) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create oscillator and gain
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    // Short high pitched tick
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.01);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.02);
  } catch (e) {
    console.error("Failed to play tick sound:", e);
  }
}

// Play a gentle slide/tactile click sound when dragging the dial
export function playTactileClick(frequency: number = 800, volume: number = 0.02) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.008);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.012);
  } catch (e) {
    // Fail silently to avoid interrupting interactions
  }
}

// Play the completion alarm sound based on profile
export function playAlarmSound(profile: SoundProfile, volume: number = 0.5) {
  if (profile === "none") return;
  
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    if (profile === "beep") {
      // Classic clean double beep
      const playBeep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now + timeOffset);
        
        gain.gain.setValueAtTime(0, now + timeOffset);
        gain.gain.linearRampToValueAtTime(volume, now + timeOffset + 0.01);
        gain.gain.setValueAtTime(volume, now + timeOffset + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.25);
      };
      
      playBeep(0);
      playBeep(0.3);
      playBeep(0.6);
    } 
    else if (profile === "zen") {
      // Rich singing bowl / gong sound
      const duration = 4.0;
      const frequencies = [150, 225, 300, 450, 600]; // Harmonic series
      
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        // Slight detune for a rich chorus effect
        if (idx > 0) {
          osc.frequency.setValueAtTime(freq + (Math.random() * 2 - 1), now);
        }
        
        // Attack-Decay envelope
        const partVolume = volume * (1 / frequencies.length) * (idx === 0 ? 1.5 : 0.7);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(partVolume, now + 0.05 + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration - (idx * 0.2));
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + duration);
      });
    } 
    else if (profile === "chime") {
      // Elegant arpeggiated chime
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        
        gain.gain.setValueAtTime(0, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + index * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 1.0);
      });
    } 
    else if (profile === "mechanical") {
      // Simulated school/clock alarm mechanical ring
      const duration = 2.5;
      const interval = 0.08; // speed of the striker
      
      for (let t = 0; t < duration; t += interval) {
        // Strike chime 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1100 + Math.random() * 10, now + t);
        
        gain1.gain.setValueAtTime(volume * 0.25, now + t);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + t + 0.07);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now + t);
        osc1.stop(now + t + 0.08);

        // Strike chime 2 (secondary resonance)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1400 + Math.random() * 15, now + t + 0.02);
        
        gain2.gain.setValueAtTime(volume * 0.15, now + t + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + t + 0.09);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + t + 0.02);
        osc2.stop(now + t + 0.1);
      }
    }
  } catch (e) {
    console.error("Failed to play alarm sound:", e);
  }
}
