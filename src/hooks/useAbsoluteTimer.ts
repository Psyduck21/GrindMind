import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A background-safe timer that relies on absolute timestamps.
 * React Native will pause setIntervals in the background, but this hook
 * recalculates the true remaining time on every tick, ensuring it snaps
 * to the mathematically correct time when the app is foregrounded.
 */
export function useAbsoluteTimer(durationMinutes: number) {
  const [timeRemainingMs, setTimeRemainingMs] = useState(durationMinutes * 60 * 1000);
  const [isActive, setIsActive] = useState(false);
  
  // Keep track of exactly when this timer is supposed to end
  const endTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!isActive) {
      // Calculate absolute unix timestamp of when this timer ends
      endTimeRef.current = Date.now() + timeRemainingMs;
      setIsActive(true);
    }
  }, [isActive, timeRemainingMs]);

  const pause = useCallback(() => {
    setIsActive(false);
    endTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      
      const now = Date.now();
      const diff = endTimeRef.current - now;

      if (diff <= 0) {
        setTimeRemainingMs(0);
        setIsActive(false);
        endTimeRef.current = null;
      } else {
        setTimeRemainingMs(diff);
      }
    }, 100); // Fast interval for smooth UI, but perfectly safe if it lags

    return () => clearInterval(interval);
  }, [isActive]);

  const totalMs = durationMinutes * 60 * 1000;
  const progress = totalMs > 0 ? (totalMs - timeRemainingMs) / totalMs : 1;

  // Formatting helpers
  const seconds = Math.floor(timeRemainingMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const formattedTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return {
    timeRemainingMs,
    formattedTime,
    progress,
    isActive,
    start,
    pause
  };
}
