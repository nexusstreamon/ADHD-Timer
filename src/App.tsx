/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  HelpCircle, 
  Sun, 
  Moon, 
  X, 
  Check, 
  Info,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  Settings
} from "lucide-react";
import ClockFace from "./components/ClockFace";
import ControlPanel from "./components/ControlPanel";
import { TimerConfig, SoundProfile } from "./types";
import { playAlarmSound, playTickSound, unlockAudioContext } from "./utils/audio";

export default function App() {
  // Timer settings & states
  const [config, setConfig] = useState<TimerConfig>({
    maxDurationSeconds: 3600, // 60 minutes default
    themeColor: "red",
    showDigital: true,
    showTicks: true,
    showNumbers: true,
    isClockwise: false, // Default is CCW (classic Time Timer style)
    soundProfile: "zen",
    isMuted: false,
    tickSoundEnabled: false,
  });

  const [timeLeft, setTimeLeft] = useState<number>(900); // Start at 15 minutes default
  const [initialTime, setInitialTime] = useState<number>(900);
  const initialTimeRef = useRef<number>(900);

  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isEditingDigital, setIsEditingDigital] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [flashOnComplete, setFlashOnComplete] = useState<boolean>(false);
  const [quirkyIndex, setQuirkyIndex] = useState<number>(0);
  const [hasRunFor30Seconds, setHasRunFor30Seconds] = useState<boolean>(false);

  // Quirky message rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setQuirkyIndex(prev => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Delay quirky messages for 30 seconds after timer starts
  useEffect(() => {
    if (isRunning) {
      const timeout = setTimeout(() => {
        setHasRunFor30Seconds(true);
      }, 30000);
      return () => clearTimeout(timeout);
    } else {
      setHasRunFor30Seconds(false);
    }
  }, [isRunning]);

  // Digital input temporary variables
  const [minInput, setMinInput] = useState<string>("15");
  const [secInput, setSecInput] = useState<string>("00");

  // Accurate timing refs
  const endTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const previousSecondRef = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);
  const configRef = useRef(config);

  // Keep config ref updated
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Sync dark mode HTML class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Synchronize inputs when timeLeft changes
  useEffect(() => {
    if (!isEditingDigital) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = Math.floor(timeLeft % 60);
      setMinInput(minutes.toString());
      setSecInput(seconds.toString().padStart(2, "0"));
    }
  }, [timeLeft, isEditingDigital]);

  // Dynamic Tab Title with countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const roundedSeconds = Math.ceil(timeLeft);
      const minutes = Math.floor(roundedSeconds / 60);
      const secs = roundedSeconds % 60;
      const formatted = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      document.title = `(${formatted}) ADHD Timer`;
    } else {
      document.title = "ADHD Timer - Visual Focus Companion";
    }
  }, [timeLeft, isRunning]);

  // Initialize Web Worker
  useEffect(() => {
    try {
      const workerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data.action === "start") {
            if (timerId) clearInterval(timerId);
            const endTime = e.data.endTime;
            timerId = setInterval(() => {
              const now = Date.now();
              const diff = (endTime - now) / 1000;
              if (diff <= 0) {
                self.postMessage({ action: "finished" });
                clearInterval(timerId);
                timerId = null;
              } else {
                self.postMessage({ action: "tick", timeLeft: Math.max(0, diff) });
              }
            }, 100);
          } else if (e.data.action === "stop") {
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      const handleMessage = (e: MessageEvent) => {
        const { action, timeLeft: workerTimeLeft } = e.data;
        if (action === "finished") {
          setTimeLeft(0);
          setIsRunning(false);
          setFlashOnComplete(true);
          playAlarmSound(configRef.current.soundProfile, 0.4);
          
          // Clear flash after 6 seconds and auto-reset to initial time
          setTimeout(() => {
            setFlashOnComplete(false);
            setTimeLeft(initialTimeRef.current);
          }, 6000);
        } else if (action === "tick" && workerTimeLeft !== undefined) {
          // If the main thread is in the background, requestAnimationFrame won't run,
          // so we update state from the worker's ticks.
          if (document.hidden) {
            const currentSecond = Math.ceil(workerTimeLeft);
            if (configRef.current.tickSoundEnabled && !configRef.current.isMuted && currentSecond !== previousSecondRef.current) {
              playTickSound(0.04);
            }
            previousSecondRef.current = currentSecond;
            setTimeLeft(workerTimeLeft);
          }
        }
      };

      workerRef.current.addEventListener("message", handleMessage);
    } catch (err) {
      console.error("Failed to create Web Worker:", err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // High precision countdown loop
  useEffect(() => {
    if (isRunning) {
      // Calculate exactly when the timer should end
      const durationMs = timeLeft * 1000;
      endTimeRef.current = Date.now() + durationMs;
      previousSecondRef.current = Math.ceil(timeLeft);

      // Start Web Worker countdown as background fallback
      if (workerRef.current) {
        workerRef.current.postMessage({ action: "start", endTime: endTimeRef.current });
      }

      const tick = () => {
        const now = Date.now();
        const diff = (endTimeRef.current - now) / 1000;

        if (diff <= 0) {
          // Timer finished!
          setTimeLeft(0);
          setIsRunning(false);
          setFlashOnComplete(true);
          playAlarmSound(config.soundProfile, 0.4);
          
          if (workerRef.current) {
            workerRef.current.postMessage({ action: "stop" });
          }

          // Clear flash after 6 seconds and auto-reset to initial time
          setTimeout(() => {
            setFlashOnComplete(false);
            setTimeLeft(initialTimeRef.current);
          }, 6000);
          return;
        }

        // Ticking audio sync (ticks on integer second transition)
        const currentSecond = Math.ceil(diff);
        if (config.tickSoundEnabled && !config.isMuted && currentSecond !== previousSecondRef.current) {
          playTickSound(0.04);
        }
        previousSecondRef.current = currentSecond;

        setTimeLeft(diff);
        animationFrameRef.current = requestAnimationFrame(tick);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ action: "stop" });
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ action: "stop" });
      }
    };
  }, [isRunning, config.tickSoundEnabled, config.isMuted, config.soundProfile]);

  // Handle configuration modifications
  const handleConfigChange = (updates: Partial<TimerConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      // If the scale changes, adjust time if it exceeds the new maximum
      if (updates.maxDurationSeconds !== undefined && timeLeft > updates.maxDurationSeconds) {
        setTimeLeft(updates.maxDurationSeconds);
      }
      return newConfig;
    });
  };

  // Play, Pause, Reset controls
  const handlePlayPause = () => {
    unlockAudioContext();
    setFlashOnComplete(false);
    if (timeLeft <= 0) {
      // Reset to initialTime if starting from 0
      setTimeLeft(initialTime);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setFlashOnComplete(false);
    // Reset to the time it was initially started with
    setTimeLeft(initialTime);
  };

  const handleSetTime = (seconds: number) => {
    unlockAudioContext();
    setFlashOnComplete(false);
    setTimeLeft(seconds);
    setInitialTime(seconds);
  };

  const handleQuickAdjust = (deltaSeconds: number) => {
    setFlashOnComplete(false);
    setTimeLeft((prev) => {
      const target = prev + deltaSeconds;
      const clamped = Math.max(0, Math.min(config.maxDurationSeconds, target));
      setInitialTime(clamped);
      return clamped;
    });
  };

  // Handle manual digital input submission
  const handleSaveDigital = () => {
    const mins = parseInt(minInput, 10) || 0;
    const secs = parseInt(secInput, 10) || 0;
    const totalSecs = mins * 60 + secs;
    
    // Clamp to valid range based on scale
    const clampedSecs = Math.max(0, Math.min(config.maxDurationSeconds, totalSecs));
    setTimeLeft(clampedSecs);
    setInitialTime(clampedSecs);
    setIsEditingDigital(false);
  };

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Format digital countdown string
  const formatTimeDigital = (seconds: number) => {
    const totalMinutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${totalMinutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTimeDigital(timeLeft)} - ADHD Timer`;
    } else {
      document.title = "MM:SS ADHD Timer";
    }
  }, [timeLeft, isRunning]);

  const QUIRKY_PHRASES = [
    "Busted! Look back at your work.",
    "I am just a clock. Go away.",
    "Staring at me won't finish that task.",
    "My numbers are boring. Your work isn't.",
    "I am ticking. You should be typing.",
    "Hey! Eyes on the prize, not the clock.",
    "Close this tab. Open your work.",
    "Shoo! Nothing to see here.",
    "Your timer is judging you. Move along.",
    "Stop reading this and start working.",
    "Look up! Your work misses you.",
    "Why are you still reading this?",
    "This screen contains zero dopamine. Leave.",
    "I see you. Back to business.",
    "Blink twice and look away now.",
    "I don't need your supervision. Go.",
    "I can count without you watching.",
    "My hands are moving, yours aren't.",
    "I'm doing my job. Do yours.",
    "Stop micromanaging my countdown.",
    "Staring makes me count slower.",
    "Seriously. I am a distraction in disguise.",
    "Your workspace is that way.",
    "Break the spell. Look away now."
  ];

  // Human-readable remaining time explanation (e.g. "12 Minutes Left")
  const getHumanTimeText = (seconds: number) => {
    if (seconds === 0) return "Time's up!";
    if (!hasRunFor30Seconds) return "\u00A0"; // Non-breaking space for layout preservation
    const index = quirkyIndex % QUIRKY_PHRASES.length;
    return QUIRKY_PHRASES[index];
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${
      isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
    }`}>
      
      {/* GLOBAL ALARM FLASH EFFECT */}
      {flashOnComplete && (
        <div className="fixed inset-0 pointer-events-none z-50 animate-pulse bg-red-500/10 dark:bg-red-500/15 ring-[12px] ring-red-500 ring-inset" />
      )}

      {/* HEADER / NAVIGATION BAR */}
      <header className="px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-800/40 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shadow-md shadow-red-500/20">
              <Clock className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">ADHD Timer</h1>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Visual Focus Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Mute Toggle */}
            <button
              id="header-mute-toggle"
              onClick={() => handleConfigChange({ isMuted: !config.isMuted })}
              title={config.isMuted ? "Unmute sounds" : "Mute sounds"}
              className="p-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800/60 transition-all text-neutral-500 dark:text-neutral-400 cursor-pointer"
            >
              {config.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDark(!isDark)}
              title="Toggle theme mode"
              className="p-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800/60 transition-all text-neutral-500 dark:text-neutral-400 cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              id="header-fullscreen-btn"
              onClick={handleToggleFullscreen}
              title="Toggle Fullscreen classroom view"
              className="p-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800/60 transition-all text-neutral-500 dark:text-neutral-400 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Settings Gear Cog Button */}
            <button
              id="header-settings-btn"
              onClick={() => setShowSettings(true)}
              title="Open timer configurations"
              className="p-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 border border-transparent transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <Settings className="w-4 h-4 animate-hover-spin" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Help Info Toggle */}
            <button
              id="help-toggle-btn"
              onClick={() => setShowHelp(true)}
              title="Help and How to Use"
              className="p-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800/60 transition-all text-neutral-500 dark:text-neutral-400 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CORE TIMER SECTION */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center">
        
        {/* CENTERED COMPONENT: VISUAL CLOCK & CENTRAL CONTROLS */}
        <div className="flex flex-col items-center gap-6 max-w-[460px] w-full">
          
          {/* Main Visual Disc Card */}
          <div className="w-full flex flex-col items-center gap-4">
            <ClockFace
              timeLeft={timeLeft}
              maxDurationSeconds={config.maxDurationSeconds}
              isClockwise={config.isClockwise}
              themeColor={config.themeColor}
              showTicks={config.showTicks}
              showNumbers={config.showNumbers}
              isMuted={config.isMuted}
              onTimeSet={handleSetTime}
              onDragStart={() => setIsRunning(false)} // Pause when dragging
            />

            {/* Digital Readout & Description */}
            <div className="text-center min-h-[72px] flex flex-col justify-center items-center w-full">
              {config.showDigital && (
                <div className="relative group inline-block">
                  {isEditingDigital ? (
                    <div id="inline-time-editor" className="flex items-center gap-1.5 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-inner">
                      <input
                        type="number"
                        min="0"
                        max="240"
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        className="w-12 text-center text-xl font-mono font-bold bg-transparent outline-none border-b border-neutral-300 focus:border-neutral-600 dark:focus:border-white text-neutral-800 dark:text-white"
                        placeholder="MM"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveDigital()}
                      />
                      <span className="text-neutral-500 font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={secInput}
                        onChange={(e) => setSecInput(e.target.value)}
                        className="w-10 text-center text-xl font-mono font-bold bg-transparent outline-none border-b border-neutral-300 focus:border-neutral-600 dark:focus:border-white text-neutral-800 dark:text-white"
                        placeholder="SS"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveDigital()}
                      />
                      <button
                        id="save-digital-btn"
                        onClick={handleSaveDigital}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Apply"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        id="cancel-digital-btn"
                        onClick={() => setIsEditingDigital(false)}
                        className="p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <button
                        id="digital-timer-readout"
                        onClick={() => setIsEditingDigital(true)}
                        title="Click to enter custom time"
                        className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight cursor-pointer hover:scale-105 transition-transform duration-200 text-neutral-900 dark:text-white relative"
                      >
                        {formatTimeDigital(timeLeft)}
                        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[9px] text-neutral-400 dark:text-neutral-500 font-sans tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Edit
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {!isEditingDigital && (
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-1 flex items-center justify-center italic">
                  {getHumanTimeText(timeLeft)}
                </p>
              )}
            </div>
          </div>

          {/* Core Visual Action Bar */}
          <div className="flex items-center justify-center gap-4 w-full">
            <button
              id="timer-reset-btn"
              onClick={handleReset}
              title="Reset Timer"
              className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              id="timer-play-pause-btn"
              onClick={handlePlayPause}
              className={`px-8 py-4 rounded-full text-white font-semibold flex items-center justify-center gap-2.5 shadow-lg shadow-red-500/10 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
                timeLeft === 0 
                  ? "bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950" 
                  : isRunning 
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" 
                    : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{timeLeft === 0 ? "Restart" : "Start Timer"}</span>
                </>
              )}
            </button>

            <button
              id="timer-settings-btn"
              onClick={() => setShowSettings(true)}
              title="Open Config / Settings Menu"
              className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t border-neutral-200/50 dark:border-neutral-900/60 text-center transition-colors duration-300 mt-auto">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Incredible visual feedback for meetings, classrooms, and productivity sprints. Fully custom-built.
        </p>
      </footer>

      {/* SLIDE-OUT DRAWER FOR SETTINGS */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div 
            id="settings-drawer-backdrop"
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-40 transition-opacity duration-300"
            onClick={() => setShowSettings(false)}
          />
          {/* Settings panel content container */}
          <div 
            id="settings-drawer-panel"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col h-full transform transition-transform duration-300 animate-slide-in"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500 animate-spin-slow" />
                <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">Timer Configuration</h2>
              </div>
              <button
                id="close-settings-drawer"
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Control Panel inside the drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <ControlPanel
                config={config}
                timeLeft={timeLeft}
                onConfigChange={handleConfigChange}
                onSetTime={handleSetTime}
                onQuickAdjust={handleQuickAdjust}
                onReset={handleReset}
              />
            </div>

            {/* Drawer Footer actions */}
            <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end">
              <button
                id="apply-settings-btn"
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Done / Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* IMMERSIVE SIMULATED THEATRE / FULLSCREEN SCREEN OVERLAY */}
      {isFullscreen && (
        <div id="theatre-fullscreen-overlay" className="fixed inset-0 z-50 bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-between p-8 sm:p-12 transition-all duration-300">
          
          {/* Top Overlay Controls */}
          <div className="w-full max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Immersive Classroom View
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Audio feedback indicator inside fullscreen */}
              <button
                id="fullscreen-mute-toggle"
                onClick={() => handleConfigChange({ isMuted: !config.isMuted })}
                className="p-3 bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800/60 rounded-2xl transition-all text-neutral-500 dark:text-neutral-400 cursor-pointer"
              >
                {config.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                id="fullscreen-exit-btn"
                onClick={handleToggleFullscreen}
                className="p-3 bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800/60 rounded-2xl transition-all font-semibold flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Central Massive Clock face */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-[480px]">
            <ClockFace
              timeLeft={timeLeft}
              maxDurationSeconds={config.maxDurationSeconds}
              isClockwise={config.isClockwise}
              themeColor={config.themeColor}
              showTicks={config.showTicks}
              showNumbers={config.showNumbers}
              isMuted={config.isMuted}
              onTimeSet={handleSetTime}
              onDragStart={() => setIsRunning(false)}
            />

            {/* Giant readout */}
            <div className="text-center">
              {config.showDigital && (
                <h2 className="font-mono text-6xl sm:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {formatTimeDigital(timeLeft)}
                </h2>
              )}
              <p className="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase mt-2 italic">
                {getHumanTimeText(timeLeft)}
              </p>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="w-full max-w-md flex items-center justify-center gap-4">
            <button
              id="fullscreen-reset"
              onClick={handleReset}
              className="p-4 rounded-full bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800/60 text-neutral-600 dark:text-neutral-400 transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              id="fullscreen-play-pause"
              onClick={handlePlayPause}
              className={`px-10 py-4.5 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-red-500/10 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
                timeLeft === 0 
                  ? "bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950" 
                  : isRunning 
                    ? "bg-amber-500 hover:bg-amber-600" 
                    : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isRunning ? "Pause Countdown" : "Start Countdown"}</span>
            </button>
          </div>
        </div>
      )}

      {/* HELP / INFORMATION MODAL */}
      {showHelp && (
        <div id="help-info-modal" className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-scale-up transition-colors duration-300">
            
            <button
              id="close-help-btn"
              onClick={() => setShowHelp(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-800 transition-all text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-red-100 dark:bg-red-950/40 text-red-500 rounded-xl">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-extrabold tracking-tight">ADHD Timer Concept</h2>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              <p>
                An <strong>ADHD Timer</strong> is an innovative visual stopwatch that represents time as a colorful graphic disk. Unlike typical clock hands or counting numbers, the visual disk disappears smoothly as time counts down.
              </p>
              
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40 space-y-2">
                <h4 className="font-bold text-neutral-800 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Key Features of this App
                </h4>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>Tactile Dragging:</strong> Click and hold any part of the clock dial to rotate and set time interactively.</li>
                  <li><strong>Adjustable Scales:</strong> Toggle between 5m, 15m, 30m, 60m, or 120m scales with dynamic numbers.</li>
                  <li><strong>Custom Sounds:</strong> Zen bowl gong, gentle double beeps, or digital chime alarms.</li>
                  <li><strong>Classroom Fullscreen:</strong> Maximize visual size to project for children, students, or team sprints.</li>
                </ul>
              </div>

              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                Created to assist with time blocking, pomodoro sprints, ADHD task focusing, exam monitoring, and presentation management.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                id="dismiss-help-btn"
                onClick={() => setShowHelp(false)}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
