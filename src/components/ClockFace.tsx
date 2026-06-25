/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";

// Helper to get labels based on duration scale
function getDialLabelsList(maxSeconds: number) {
  const mins = maxSeconds / 60;
  if (mins === 5) {
    return [
      { text: "0", fraction: 0 },
      { text: "1", fraction: 1/5 },
      { text: "2", fraction: 2/5 },
      { text: "3", fraction: 3/5 },
      { text: "4", fraction: 4/5 },
      { text: "5", fraction: 5/5 }
    ];
  }
  if (mins === 15) {
    return [
      { text: "0", fraction: 0 },
      { text: "2.5", fraction: 2.5/15 },
      { text: "5", fraction: 5/15 },
      { text: "7.5", fraction: 7.5/15 },
      { text: "10", fraction: 10/15 },
      { text: "12.5", fraction: 12.5/15 },
      { text: "15", fraction: 15/15 }
    ];
  }
  if (mins === 30) {
    return [
      { text: "0", fraction: 0 },
      { text: "5", fraction: 5/30 },
      { text: "10", fraction: 10/30 },
      { text: "15", fraction: 15/30 },
      { text: "20", fraction: 20/30 },
      { text: "25", fraction: 25/30 },
      { text: "30", fraction: 30/30 }
    ];
  }
  if (mins === 120) {
    return [
      { text: "0", fraction: 0 },
      { text: "10", fraction: 10/120 },
      { text: "20", fraction: 20/120 },
      { text: "30", fraction: 30/120 },
      { text: "40", fraction: 40/120 },
      { text: "50", fraction: 50/120 },
      { text: "60", fraction: 60/120 },
      { text: "70", fraction: 70/120 },
      { text: "80", fraction: 80/120 },
      { text: "90", fraction: 90/120 },
      { text: "100", fraction: 100/120 },
      { text: "110", fraction: 110/120 }
    ];
  }
  // Default 60 mins
  return [
    { text: "0", fraction: 0 },
    { text: "5", fraction: 5/60 },
    { text: "10", fraction: 10/60 },
    { text: "15", fraction: 15/60 },
    { text: "20", fraction: 20/60 },
    { text: "25", fraction: 25/60 },
    { text: "30", fraction: 30/60 },
    { text: "35", fraction: 35/60 },
    { text: "40", fraction: 40/60 },
    { text: "45", fraction: 45/60 },
    { text: "50", fraction: 50/60 },
    { text: "55", fraction: 55/60 }
  ];
}

interface ClockFaceProps {
  timeLeft: number;
  maxDurationSeconds: number;
  isClockwise: boolean;
  themeColor: "red" | "teal" | "emerald" | "amber" | "indigo" | "rose" | "violet";
  showTicks: boolean;
  showNumbers: boolean;
  isMuted: boolean;
  onTimeSet: (seconds: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function ClockFace({
  timeLeft,
  maxDurationSeconds,
  isClockwise,
  themeColor,
  showTicks,
  showNumbers,
  isMuted,
  onTimeSet,
  onDragStart,
  onDragEnd,
}: ClockFaceProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const CX = 150;
  const CY = 150;
  const R = 110; // Outer radius of dial

  // Color mapping
  const colorMap = {
    red: "fill-red-500 stroke-red-600",
    teal: "fill-teal-500 stroke-teal-600",
    emerald: "fill-emerald-500 stroke-emerald-600",
    amber: "fill-amber-500 stroke-amber-600",
    indigo: "fill-indigo-500 stroke-indigo-600",
    rose: "fill-rose-500 stroke-rose-600",
    violet: "fill-violet-500 stroke-violet-600",
  };

  const selectedColor = colorMap[themeColor] || colorMap.red;

  // Stable reference to state to avoid stale closures in global dragging event listeners
  const stateRef = useRef({
    isClockwise,
    maxDurationSeconds,
    timeLeft,
    isMuted,
    onTimeSet,
  });

  useEffect(() => {
    stateRef.current = {
      isClockwise,
      maxDurationSeconds,
      timeLeft,
      isMuted,
      onTimeSet,
    };
  }, [isClockwise, maxDurationSeconds, timeLeft, isMuted, onTimeSet]);

  const handlePointerEvent = (clientX: number, clientY: number, isDraggingMove: boolean = false) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const {
      isClockwise: refClockwise,
      maxDurationSeconds: refMaxSec,
      timeLeft: refTimeLeft,
      isMuted: refMuted,
      onTimeSet: refOnTimeSet,
    } = stateRef.current;

    // Angle relative to 12 o'clock (0 rad at 12 o'clock, clockwise is positive)
    let angleRad = Math.atan2(dy, dx) + Math.PI / 2;
    if (angleRad < 0) {
      angleRad += 2 * Math.PI;
    }

    // Fraction calculation
    let fraction = 0;
    if (refClockwise) {
      fraction = angleRad / (2 * Math.PI);
    } else {
      fraction = (2 * Math.PI - angleRad) / (2 * Math.PI);
    }

    // Prevent snapping directly from 0% to 100% or vice versa too easily at the top
    if (fraction > 0.98) {
      fraction = 1;
    } else if (fraction < 0.01) {
      fraction = 0;
    }

    // To prevent accidental wrapping around the 12 o'clock line (0% <-> 100%) during active dragging:
    if (isDraggingMove) {
      const currentFraction = refTimeLeft / refMaxSec;
      const fractionDiff = fraction - currentFraction;
      if (Math.abs(fractionDiff) > 0.5) {
        if (currentFraction < 0.25 && fraction > 0.75) {
          fraction = 0;
        } else if (currentFraction > 0.75 && fraction < 0.25) {
          fraction = 1;
        }
      }
    }

    const rawSeconds = fraction * refMaxSec;
    
    // Snapping step size
    let snapStep = 60; // default 1 min
    if (refMaxSec <= 300) {
      snapStep = 5; // 5 seconds for 5-minute scale
    } else if (refMaxSec <= 1800) {
      snapStep = 15; // 15 seconds for 15-30 minute scales
    } else if (refMaxSec > 3600) {
      snapStep = 120; // 2 mins for 120-minute scale
    }

    const snappedSeconds = Math.max(0, Math.min(refMaxSec, Math.round(rawSeconds / snapStep) * snapStep));
    
    if (snappedSeconds !== refTimeLeft) {
      refOnTimeSet(snappedSeconds);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Left click only
    e.preventDefault(); // Disable browser native selection and ghost element dragging
    setIsDragging(true);
    onDragStart?.();
    handlePointerEvent(e.clientX, e.clientY, false);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches[0]) {
      if (e.cancelable) {
        e.preventDefault(); // Prevents scroll/gesture interference during dragging/taps
      }
      setIsDragging(true);
      onDragStart?.();
      handlePointerEvent(e.touches[0].clientX, e.touches[0].clientY, false);
    }
  };

  // Global events for uninterrupted dragging even outside the SVG area
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handlePointerEvent(e.clientX, e.clientY, true);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointerEvent(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onDragEnd?.();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging, onDragEnd]);

  // Construct remaining time wedge path
  const remainingFraction = timeLeft / maxDurationSeconds;
  const wedgeAngle = remainingFraction * 2 * Math.PI;

  let wedgePath = "";
  if (remainingFraction > 0 && remainingFraction < 1) {
    // End point coordinates on perimeter
    let endX = CX;
    let endY = CY;
    if (isClockwise) {
      endX = CX + R * Math.sin(wedgeAngle);
      endY = CY - R * Math.cos(wedgeAngle);
    } else {
      endX = CX - R * Math.sin(wedgeAngle);
      endY = CY - R * Math.cos(wedgeAngle);
    }

    const largeArcFlag = wedgeAngle > Math.PI ? 1 : 0;
    const sweepFlag = isClockwise ? 1 : 0;

    wedgePath = `M ${CX} ${CY} L ${CX} ${CY - R} A ${R} ${R} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY} Z`;
  }

  // Draw 60 clock face ticks
  const ticks = [];
  if (showTicks) {
    for (let i = 0; i < 60; i++) {
      const angle = i * (2 * Math.PI / 60);
      const isMajor = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      
      const tickLength = isQuarter ? 10 : isMajor ? 7 : 4;
      const startR = R - tickLength;
      
      const x1 = CX + startR * Math.sin(angle);
      const y1 = CY - startR * Math.cos(angle);
      const x2 = CX + R * Math.sin(angle);
      const y2 = CY - R * Math.cos(angle);

      ticks.push(
        <line
          key={`tick-${i}`}
          id={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className={`${
            isQuarter 
              ? "stroke-neutral-800 dark:stroke-neutral-200 stroke-[2px]" 
              : isMajor 
                ? "stroke-neutral-600 dark:stroke-neutral-400 stroke-[1.5px]" 
                : "stroke-neutral-300 dark:stroke-neutral-700 stroke-[1px]"
          }`}
        />
      );
    }
  }

  // Position dial labels (e.g. 0, 5, 10, ... 55)
  const dialLabels = getDialLabelsList(maxDurationSeconds);
  const textRadius = R - 20;

  return (
    <div className="relative select-none aspect-square w-full max-w-[420px] mx-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800/60 shadow-xl p-8 transition-colors duration-300">
      
      {/* Clock Bezel Frame */}
      <div className="relative w-full h-full rounded-2xl bg-neutral-50 dark:bg-neutral-950 p-2 border border-neutral-200/40 dark:border-neutral-800/40 flex items-center justify-center">
        
        <svg
          ref={svgRef}
          id="timer-clock-face"
          viewBox="0 0 300 300"
          className={`w-full h-full overflow-visible touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* SVG Definitions for clipping and gradient masks to guarantee zero bleeding */}
          <defs>
            <clipPath id="dial-clip">
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>

          {/* Subtle Outer Dial Shadow/Glow */}
          <circle
            cx={CX}
            cy={CY}
            r={R + 2}
            className="fill-none stroke-neutral-200/30 dark:stroke-neutral-800/30 stroke-1"
          />

          {/* Core White Circular dial body (background only) */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            className="fill-white dark:fill-neutral-900"
          />

          {/* Interactive Wedges inside Clip Path to prevent any possible edge bleeding */}
          <g clipPath="url(#dial-clip)">
            {/* 1. Full Circle state */}
            {remainingFraction === 1 && (
              <circle
                cx={CX}
                cy={CY}
                r={R}
                className={`${selectedColor} opacity-95`}
              />
            )}

            {/* 2. Standard slice Wedge representing remaining time */}
            {remainingFraction > 0 && remainingFraction < 1 && (
              <path
                id="countdown-wedge"
                d={wedgePath}
                className={`${selectedColor} opacity-95`}
              />
            )}
          </g>

          {/* Crisp Outer Border of the dial body (drawn on top of the wedges to prevent color bleed) */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            className="fill-none stroke-neutral-200 dark:stroke-neutral-800 stroke-[1.5px]"
          />

          {/* Ticks layer */}
          {ticks}

          {/* Major quadrant markers */}
          <circle cx={CX} cy={CY - R} r="3" className="fill-neutral-900 dark:fill-white" />
          <circle cx={CX + R} cy={CY} r="2" className="fill-neutral-500 dark:fill-neutral-400" />
          <circle cx={CX} cy={CY + R} r="2" className="fill-neutral-500 dark:fill-neutral-400" />
          <circle cx={CX - R} cy={CY} r="2" className="fill-neutral-500 dark:fill-neutral-400" />

          {/* Dial labels */}
          {showNumbers &&
            dialLabels.map((label, index) => {
              // Calculate angular placement based on clockwise/counter-clockwise setting
              const angle = label.fraction * 2 * Math.PI;
              
              let x = CX;
              let y = CY;
              if (isClockwise) {
                x = CX + textRadius * Math.sin(angle);
                y = CY - textRadius * Math.cos(angle);
              } else {
                x = CX - textRadius * Math.sin(angle);
                y = CY - textRadius * Math.cos(angle);
              }

              // Adjust alignment so labels don't bunch up
              let textAnchor = "middle";
              let dy = "0.35em";
              
              if (x < CX - 5) textAnchor = "end";
              else if (x > CX + 5) textAnchor = "start";
              
              if (y < CY - 10) dy = "0.1em";
              else if (y > CY + 10) dy = "0.7em";

              // Clean 0 labeled as maximum scale if it's the 100% boundary
              const displayText = label.text;

              return (
                <text
                  key={`label-${index}`}
                  id={`dial-label-${index}`}
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  dy={dy}
                  className="font-mono text-[10px] font-semibold fill-neutral-700 dark:fill-neutral-300 pointer-events-none transition-colors duration-300"
                >
                  {displayText}
                </text>
              );
            })}

          {/* Center tactile hub knob */}
          <circle
            cx={CX}
            cy={CY}
            r="12"
            className="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-700 stroke-[1.5px] shadow-sm pointer-events-none"
          />
          {/* Inner accent ring */}
          <circle
            cx={CX}
            cy={CY}
            r="5"
            className="fill-neutral-800 dark:fill-neutral-200 pointer-events-none"
          />
        </svg>

        {/* Tap/Drag visual guide overlay when remaining is 0 */}
        {timeLeft === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 bg-neutral-900/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-sm">
              Drag or Tap Dial to Start
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
