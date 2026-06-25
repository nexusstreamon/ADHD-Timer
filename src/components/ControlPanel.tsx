/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Volume2, 
  VolumeX, 
  Clock, 
  Eye, 
  Settings, 
  Sliders, 
  RotateCcw,
  Plus,
  Minus
} from "lucide-react";
import { SoundProfile, TimerConfig } from "../types";
import { playAlarmSound } from "../utils/audio";

interface ControlPanelProps {
  config: TimerConfig;
  timeLeft: number;
  onConfigChange: (updates: Partial<TimerConfig>) => void;
  onSetTime: (seconds: number) => void;
  onQuickAdjust: (deltaSeconds: number) => void;
  onReset: () => void;
}

export default function ControlPanel({
  config,
  timeLeft,
  onConfigChange,
  onSetTime,
  onQuickAdjust,
  onReset,
}: ControlPanelProps) {
  const {
    maxDurationSeconds,
    themeColor,
    showDigital,
    showTicks,
    showNumbers,
    isClockwise,
    soundProfile,
    isMuted,
    tickSoundEnabled,
  } = config;

  const scales = [
    { label: "5 Min Scale", value: 300 },
    { label: "15 Min Scale", value: 900 },
    { label: "30 Min Scale", value: 1800 },
    { label: "60 Min Scale", value: 3600 },
    { label: "2 Hours Scale", value: 7200 },
  ];

  const presets = [
    { label: "5 Min", value: 300 },
    { label: "15 Min", value: 900 },
    { label: "30 Min", value: 1800 },
    { label: "60 Min", value: 3600 },
  ];

  const colors: Array<{ id: TimerConfig["themeColor"]; bgClass: string; label: string }> = [
    { id: "red", bgClass: "bg-red-500 ring-red-300", label: "Classic Red" },
    { id: "rose", bgClass: "bg-rose-500 ring-rose-300", label: "Sunset Rose" },
    { id: "amber", bgClass: "bg-amber-500 ring-amber-300", label: "Warm Amber" },
    { id: "emerald", bgClass: "bg-emerald-500 ring-emerald-300", label: "Forest Emerald" },
    { id: "teal", bgClass: "bg-teal-500 ring-teal-300", label: "Ocean Teal" },
    { id: "indigo", bgClass: "bg-indigo-500 ring-indigo-300", label: "Royal Indigo" },
    { id: "violet", bgClass: "bg-violet-500 ring-violet-300", label: "Cosmic Violet" },
  ];

  const soundProfiles: Array<{ id: SoundProfile; label: string }> = [
    { id: "zen", label: "Zen Singing Bowl" },
    { id: "beep", label: "Gentle Beep" },
    { id: "chime", label: "Digital Chime" },
    { id: "mechanical", label: "Mechanical Bell" },
    { id: "none", label: "Mute / Silent" },
  ];

  // Helper to handle scale switches and ensure current timeLeft doesn't exceed new scale
  const handleScaleChange = (seconds: number) => {
    onConfigChange({ maxDurationSeconds: seconds });
    if (timeLeft > seconds) {
      onSetTime(seconds);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800/60 shadow-xl p-6 sm:p-8 transition-colors duration-300">
      
      {/* SECTION 1: DIAL SCALE SELECTOR */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Dial Scale (Maximum Limit)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {scales.map((scale) => (
            <button
              key={scale.value}
              id={`scale-btn-${scale.value}`}
              onClick={() => handleScaleChange(scale.value)}
              className={`py-2 px-3 text-xs font-medium rounded-xl transition-all duration-200 border ${
                maxDurationSeconds === scale.value
                  ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-sm"
                  : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-800"
              }`}
            >
              {scale.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: QUICK PRESET TIME SETTERS */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5" /> Preset Durations
        </h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              id={`preset-btn-${preset.value}`}
              onClick={() => {
                // Adjust scale automatically if preset exceeds current max
                if (preset.value > maxDurationSeconds) {
                  onConfigChange({ maxDurationSeconds: preset.value });
                }
                onSetTime(preset.value);
              }}
              className="flex-1 min-w-[70px] py-2.5 px-3 text-xs font-semibold rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-300 transition-all duration-200"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3: QUICK ADJUST BUTTONS */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5" /> Fine Tune Adjustment
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <button
            id="adjust-minus-5m"
            onClick={() => onQuickAdjust(-300)}
            disabled={timeLeft === 0}
            className="py-2.5 px-3 flex items-center justify-center gap-1 text-xs font-medium rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 border border-red-200/50 dark:border-red-900/40 disabled:opacity-50 transition-all"
          >
            <Minus className="w-3 h-3" /> 5m
          </button>
          <button
            id="adjust-minus-1m"
            onClick={() => onQuickAdjust(-60)}
            disabled={timeLeft === 0}
            className="py-2.5 px-3 flex items-center justify-center gap-1 text-xs font-medium rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 border border-red-200/50 dark:border-red-900/40 disabled:opacity-50 transition-all"
          >
            <Minus className="w-3 h-3" /> 1m
          </button>
          <button
            id="adjust-plus-1m"
            onClick={() => onQuickAdjust(60)}
            disabled={timeLeft >= maxDurationSeconds}
            className="py-2.5 px-3 flex items-center justify-center gap-1 text-xs font-medium rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 border border-emerald-200/50 dark:border-emerald-900/40 disabled:opacity-50 transition-all"
          >
            <Plus className="w-3 h-3" /> 1m
          </button>
          <button
            id="adjust-plus-5m"
            onClick={() => onQuickAdjust(300)}
            disabled={timeLeft >= maxDurationSeconds}
            className="py-2.5 px-3 flex items-center justify-center gap-1 text-xs font-medium rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 border border-emerald-200/50 dark:border-emerald-900/40 disabled:opacity-50 transition-all"
          >
            <Plus className="w-3 h-3" /> 5m
          </button>
        </div>
      </div>

      {/* SECTION 4: COLOR SCHEME */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" /> Disc Color Theme
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {colors.map((c) => (
            <button
              key={c.id}
              id={`color-btn-${c.id}`}
              onClick={() => onConfigChange({ themeColor: c.id })}
              title={c.label}
              className={`w-8 h-8 rounded-full ${c.bgClass} cursor-pointer flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                themeColor === c.id
                  ? "ring-4 ring-offset-2 dark:ring-offset-neutral-900 ring-neutral-950 dark:ring-white scale-105"
                  : ""
              }`}
            >
              {themeColor === c.id && (
                <span className="w-2 h-2 rounded-full bg-white block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 5: AUDIO NOTIFICATIONS */}
      <div className="border-t border-neutral-100 dark:border-neutral-800/60 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5" /> Sound Alerts
        </h3>
        
        {/* Toggle Muted */}
        <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40 mb-3">
          <div className="flex items-center gap-3">
            {isMuted ? (
              <VolumeX className="w-4.5 h-4.5 text-neutral-400" />
            ) : (
              <Volume2 className="w-4.5 h-4.5 text-neutral-900 dark:text-white" />
            )}
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {isMuted ? "Sound Muted" : "Sound Enabled"}
              </p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                Alarms, dragging sounds, & click tones
              </p>
            </div>
          </div>
          <button
            id="sound-mute-toggle"
            onClick={() => onConfigChange({ isMuted: !isMuted })}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              !isMuted ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-neutral-900 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                !isMuted ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Sound Profile Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {soundProfiles.map((sound) => (
            <button
              key={sound.id}
              id={`sound-profile-${sound.id}`}
              disabled={isMuted}
              onClick={() => {
                onConfigChange({ soundProfile: sound.id });
                if (sound.id !== "none") {
                  playAlarmSound(sound.id, 0.4);
                }
              }}
              className={`py-2 px-2.5 text-left text-xs font-medium rounded-xl border transition-all ${
                isMuted
                  ? "opacity-40 cursor-not-allowed bg-neutral-50 border-neutral-100 text-neutral-400 dark:bg-neutral-950 dark:border-neutral-900"
                  : soundProfile === sound.id
                    ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-sm"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800"
              }`}
            >
              {sound.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 6: DISPLAY & VISUAL OPTIONS */}
      <div className="border-t border-neutral-100 dark:border-neutral-800/60 pt-5 flex flex-col gap-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" /> Customizer Preferences
        </h3>

        {/* Toggle Ticking Sound */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Continuous Ticking Sound</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Play mechanical tick sound each second</p>
          </div>
          <button
            id="toggle-ticking-sound"
            disabled={isMuted}
            onClick={() => onConfigChange({ tickSoundEnabled: !tickSoundEnabled })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
              isMuted ? "opacity-30 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800" : tickSoundEnabled ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-neutral-900 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                !isMuted && tickSoundEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Toggle Clockwise vs CCW */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Clockwise Orientation</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Classic CCW Time Timer vs Standard stopwatch</p>
          </div>
          <button
            id="toggle-orientation"
            onClick={() => onConfigChange({ isClockwise: !isClockwise })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
              isClockwise ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-neutral-900 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                isClockwise ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Toggle Digital Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Digital Countdown Display</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Toggle numeric timer readout</p>
          </div>
          <button
            id="toggle-digital"
            onClick={() => onConfigChange({ showDigital: !showDigital })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
              showDigital ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-neutral-900 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                showDigital ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Toggle Tick Marks */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Clock Tick Marks</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Show fine lines for single minutes</p>
          </div>
          <button
            id="toggle-ticks"
            onClick={() => onConfigChange({ showTicks: !showTicks })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
              showTicks ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-neutral-900 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                showTicks ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Toggle Dial Numbers */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Clock Face Numbers</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Show numeric labels on the dial rim</p>
          </div>
          <button
            id="toggle-numbers"
            onClick={() => onConfigChange({ showNumbers: !showNumbers })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
              showNumbers ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-neutral-900 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                showNumbers ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
