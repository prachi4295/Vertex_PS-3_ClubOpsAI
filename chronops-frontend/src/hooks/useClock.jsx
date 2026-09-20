import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const ClockContext = createContext(null);

/**
 * Simulated Clock Hook & Provider.
 * Allows accelerating time by 1x, 30x, 60x so a 6-hour event can be demoed in minutes.
 * Ensures zero time-skipping or discontinuities when toggling speed multipliers.
 */
export function ClockProvider({ children, initialTime = null }) {
  const [speed, setSpeedState] = useState(1); // 1x | 30x | 60x (or slider 1-60)
  const [isPaused, setIsPaused] = useState(false);

  // Continuous time calculation anchors
  const [currentTime, setCurrentTime] = useState(() => initialTime || new Date());
  const baseRealTimeRef = useRef(Date.now());
  const baseSimulatedTimeRef = useRef(initialTime ? new Date(initialTime).getTime() : Date.now());
  const speedRef = useRef(1);
  const isPausedRef = useRef(false);

  // Update speed smoothly without time jumps
  const setSpeed = useCallback((newSpeed) => {
    const validSpeed = Math.max(1, Math.min(30, Number(newSpeed) || 1));
    const nowReal = Date.now();

    if (!isPausedRef.current) {
      // Advance base simulated time to right now at current speed
      const elapsedReal = nowReal - baseRealTimeRef.current;
      baseSimulatedTimeRef.current += elapsedReal * speedRef.current;
    }

    baseRealTimeRef.current = nowReal;
    speedRef.current = validSpeed;
    setSpeedState(validSpeed);
    setCurrentTime(new Date(baseSimulatedTimeRef.current));
  }, []);

  // Pause / Resume
  const togglePause = useCallback(() => {
    const nowReal = Date.now();
    if (!isPausedRef.current) {
      // Pausing: lock in simulated time
      const elapsedReal = nowReal - baseRealTimeRef.current;
      baseSimulatedTimeRef.current += elapsedReal * speedRef.current;
      isPausedRef.current = true;
      setIsPaused(true);
    } else {
      // Resuming: reset base real time
      baseRealTimeRef.current = nowReal;
      isPausedRef.current = false;
      setIsPaused(false);
    }
  }, []);

  // Reset clock to right now or specific date
  const resetClock = useCallback((targetDate = new Date()) => {
    const targetMs = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
    baseRealTimeRef.current = Date.now();
    baseSimulatedTimeRef.current = targetMs;
    setCurrentTime(new Date(targetMs));
  }, []);

  // Set specific simulated time
  const setSimulatedTime = useCallback((targetDate) => {
    resetClock(targetDate);
  }, [resetClock]);

  // High-frequency tick loop (runs every 100ms for smooth countdowns)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      const nowReal = Date.now();
      const elapsedReal = nowReal - baseRealTimeRef.current;
      const currentSimulatedMs = baseSimulatedTimeRef.current + elapsedReal * speedRef.current;
      setCurrentTime(new Date(currentSimulatedMs));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <ClockContext.Provider
      value={{
        currentTime,
        speed,
        setSpeed,
        isPaused,
        togglePause,
        resetClock,
        setSimulatedTime,
      }}
    >
      {children}
    </ClockContext.Provider>
  );
}

export function useClock() {
  const ctx = useContext(ClockContext);
  if (!ctx) {
    // Fallback if rendered outside ClockProvider
    return {
      currentTime: new Date(),
      speed: 1,
      setSpeed: () => {},
      isPaused: false,
      togglePause: () => {},
      resetClock: () => {},
      setSimulatedTime: () => {},
    };
  }
  return ctx;
}

/**
 * Formats a Date object as 24-hour "HH:mm:ss".
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatClockTime(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "00:00:00";
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Formats seconds into MM:SS (or HH:MM:SS if over an hour).
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatCountdown(totalSeconds) {
  const absSec = Math.abs(Math.floor(totalSeconds));
  const hours = Math.floor(absSec / 3600);
  const minutes = Math.floor((absSec % 3600) / 60);
  const seconds = absSec % 60;

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    const hh = hours.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
