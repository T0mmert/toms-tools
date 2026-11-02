import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startIdleLock } from './idleLock.js';

const MINUTE = 60_000;

let target;
let doc;
let onLock;
let stop;

function start(minutes = 5) {
  stop = startIdleLock({ idleMs: minutes * MINUTE, onLock, target, doc });
}

function setHidden(hidden) {
  doc.hidden = hidden;
  doc.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  target = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false });
  onLock = vi.fn();
});

afterEach(() => {
  stop?.();
  vi.useRealTimers();
});

describe('idle lock', () => {
  it('locks once after the idle time', () => {
    start(5);
    vi.advanceTimersByTime(4 * MINUTE);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MINUTE + 15_000);
    vi.advanceTimersByTime(10 * MINUTE);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('starts counting again on any input', () => {
    start(5);
    vi.advanceTimersByTime(4 * MINUTE);
    target.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(4 * MINUTE);
    target.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(4 * MINUTE);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MINUTE + 15_000);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('locks a tab left in the background for two minutes', () => {
    start(30);
    setHidden(true);
    vi.advanceTimersByTime(2 * MINUTE + 15_000);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('checks the background rule the moment the tab returns', () => {
    start(30);
    setHidden(true);
    // Background tabs may not run the interval at all; jump the clock only.
    vi.setSystemTime(Date.now() + 3 * MINUTE);
    setHidden(false);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('does not lock after a short trip to another tab', () => {
    start(30);
    setHidden(true);
    vi.advanceTimersByTime(MINUTE);
    setHidden(false);
    vi.advanceTimersByTime(5 * MINUTE);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('stops watching when stopped', () => {
    start(5);
    stop();
    vi.advanceTimersByTime(60 * MINUTE);
    expect(onLock).not.toHaveBeenCalled();
  });
});
