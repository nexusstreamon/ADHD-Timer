/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SoundProfile = "zen" | "beep" | "chime" | "mechanical" | "none";

export interface TimerConfig {
  maxDurationSeconds: number; // e.g. 300, 900, 1800, 3600, 7200
  themeColor: "red" | "teal" | "emerald" | "amber" | "indigo" | "rose" | "violet";
  showDigital: boolean;
  showTicks: boolean;
  showNumbers: boolean;
  isClockwise: boolean;
  soundProfile: SoundProfile;
  isMuted: boolean;
  tickSoundEnabled: boolean;
}
