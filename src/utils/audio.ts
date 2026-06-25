/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function unlockAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Play a silent oscillator to fully unlock on iOS and some modern browsers
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(ctx.currentTime + 0.001);
  } catch (err) {
    console.warn("Could not unlock audio context", err);
  }
}

export type SoundProfile = "zen" | "beep" | "chime" | "mechanical" | "none";

/// Cache for generated WAV data URIs to avoid regenerating on every play
const wavCache: Record<string, string> = {};

function generateComplexWavDataUri(profile: string, volume: number = 0.5): string {
  const cacheKey = `${profile}_${volume}`;
  if (wavCache[cacheKey]) {
    return wavCache[cacheKey];
  }

  const sampleRate = 11025; // Compact sample rate for quick generation and low memory
  let duration = 2.0;
  if (profile === "zen") duration = 4.0;
  else if (profile === "chime") duration = 1.5;
  else if (profile === "mechanical") duration = 2.5;
  else if (profile === "tick") duration = 0.03;

  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(buffer.buffer);

  // RIFF-WAVE Header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  const getSampleVal = (t: number): number => {
    if (profile === "tick") {
      if (t <= 0.02) {
        const env = t < 0.002 ? t / 0.002 : Math.max(0, 1 - (t - 0.002) / 0.013);
        return Math.sin(2 * Math.PI * 1200 * t) * env * volume * 0.8;
      }
      return 0;
    }

    if (profile === "beep") {
      const beepIntervals = [
        { start: 0.0, end: 0.2 },
        { start: 0.3, end: 0.5 },
        { start: 0.6, end: 0.8 },
      ];
      for (const b of beepIntervals) {
        if (t >= b.start && t <= b.end) {
          const beepT = t - b.start;
          const duration = b.end - b.start;
          const envelope = beepT < 0.01 ? beepT / 0.01 : beepT > duration - 0.05 ? (duration - beepT) / 0.05 : 1;
          return Math.sin(2 * Math.PI * 880 * t) * envelope * volume * 0.8;
        }
      }
      return 0;
    }

    if (profile === "zen") {
      const freqs = [150, 225, 300, 450, 600];
      let sum = 0;
      for (let idx = 0; idx < freqs.length; idx++) {
        const freq = freqs[idx];
        const partVolume = (idx === 0 ? 0.4 : 0.15) * volume;
        const decay = 1.2 - idx * 0.15;
        const envelope = Math.exp(-t * decay);
        sum += Math.sin(2 * Math.PI * freq * t + Math.sin(2 * Math.PI * 3 * t) * 0.05) * envelope * partVolume;
      }
      return sum;
    }

    if (profile === "chime") {
      const notes = [
        { freq: 523.25, start: 0.0 },
        { freq: 659.25, start: 0.15 },
        { freq: 783.99, start: 0.30 },
        { freq: 1046.50, start: 0.45 },
      ];
      let sum = 0;
      for (const n of notes) {
        if (t >= n.start) {
          const noteT = t - n.start;
          const envelope = Math.exp(-noteT * 3.5);
          sum += Math.sin(2 * Math.PI * n.freq * noteT) * envelope * (volume * 0.35);
        }
      }
      return sum;
    }

    if (profile === "mechanical") {
      const strikeInterval = 0.08;
      const strikeDuration = 0.065;
      const strikeTimeInInterval = t % strikeInterval;
      if (strikeTimeInInterval < strikeDuration && t < 2.3) {
        const strikeIndex = Math.floor(t / strikeInterval);
        const f1 = 1100 + (strikeIndex % 3) * 5;
        const f2 = 1400 - (strikeIndex % 4) * 8;
        const env = Math.exp(-strikeTimeInInterval * 45);
        return (Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.4) * env * volume * 0.6;
      }
      return 0;
    }

    return 0;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sampleVal = getSampleVal(t);
    const clamped = Math.max(-1, Math.min(1, sampleVal));
    const intSample = Math.floor(clamped * 32767);
    view.setInt16(44 + i * 2, intSample, true);
  }

  let binary = "";
  const len = buffer.byteLength;
  const chunkSize = 16384;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = buffer.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCodePoint(...chunk);
  }
  
  const dataUri = `data:audio/wav;base64,${btoa(binary)}`;
  wavCache[cacheKey] = dataUri;
  return dataUri;
}

// Play a dynamic tick sound
export function playTickSound(volume: number = 0.05) {
  try {
    const wavData = generateComplexWavDataUri("tick", volume * 1.5);
    const audio = new Audio(wavData);
    audio.play().catch(() => {
      // Fallback to simple Web Audio API if browser blocks play
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.01);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.02);
      } catch (err) {}
    });
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
    const wavData = generateComplexWavDataUri(profile, volume);
    const audio = new Audio(wavData);
    audio.play().catch((err) => {
      console.warn("HTML5 Audio play failed, falling back to Web Audio API:", err);
      // Fallback to legacy Web Audio API scheduler
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        if (profile === "beep") {
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
        } else if (profile === "zen") {
          const duration = 4.0;
          const frequencies = [150, 225, 300, 450, 600];
          frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            if (idx > 0) osc.frequency.setValueAtTime(freq + (Math.random() * 2 - 1), now);
            const partVolume = volume * (1 / frequencies.length) * (idx === 0 ? 1.5 : 0.7);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(partVolume, now + 0.05 + idx * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration - (idx * 0.2));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
          });
        } else if (profile === "chime") {
          const notes = [523.25, 659.25, 783.99, 1046.50];
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
      } catch (fallbackErr) {
        console.error("All audio play methods failed:", fallbackErr);
      }
    });
  } catch (e) {
    console.error("Failed to play alarm sound:", e);
  }
}
