import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Run `callback` immediately and then every `intervalMs`, but only while the
 * screen is focused AND the app is in the foreground. Tab screens stay mounted
 * in the background, so a plain setInterval would keep polling forever.
 *
 * The latest `callback` is always used (kept in a ref), so screens never see
 * stale closures when their state changes between ticks.
 *
 * @param {() => void | Promise<void>} callback
 * @param {number} intervalMs
 * @param {{ enabled?: boolean, immediate?: boolean }} [options]
 */
export const usePolling = (callback, intervalMs, { enabled = true, immediate = true } = {}) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef(null);
  const activeRef = useRef(AppState.currentState === 'active');
  const focusedRef = useRef(false);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    if (!enabled || !focusedRef.current || !activeRef.current) return;
    if (immediate) callbackRef.current();
    if (intervalMs > 0) {
      timerRef.current = setInterval(() => callbackRef.current(), intervalMs);
    }
  }, [enabled, immediate, intervalMs, stop]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      start();
      return () => {
        focusedRef.current = false;
        stop();
      };
    }, [start, stop])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const nowActive = state === 'active';
      const wasActive = activeRef.current;
      activeRef.current = nowActive;
      if (nowActive && !wasActive) start();
      else if (!nowActive) stop();
    });
    return () => sub.remove();
  }, [start, stop]);

  // Manual trigger (pull-to-refresh, button).
  const refresh = useCallback(() => callbackRef.current(), []);

  return { refresh, stop, restart: start };
};

export default usePolling;
