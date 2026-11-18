import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  projectMomentum,
  resolveSheetSnapOrDismiss,
  rubberbandOffset,
} from '../src/hooks/useSheetGesture.ts';

describe('projectMomentum', () => {
  it('returns 0 for zero or non-finite velocity', () => {
    assert.equal(projectMomentum(0), 0);
    assert.equal(projectMomentum(-0), 0);
    assert.equal(projectMomentum(Number.NaN), 0);
    assert.equal(projectMomentum(Number.POSITIVE_INFINITY), 0);
  });

  it('computes positive and negative exponential displacement symmetrically', () => {
    const pos = projectMomentum(1000, 0.992);
    const neg = projectMomentum(-1000, 0.992);
    const expected = (1000 / 1000) * (0.992 / (1 - 0.992));

    assert.ok(Math.abs(pos - expected) < 1e-9);
    assert.ok(pos > 0);
    assert.equal(neg, -pos);
  });

  it('guards invalid deceleration rates', () => {
    assert.equal(projectMomentum(500, 1), 0);
    assert.equal(projectMomentum(500, 0), 0);
    assert.equal(projectMomentum(500, 1.2), 0);
  });
});

describe('rubberbandOffset', () => {
  it('returns 0 when dimension is non-positive or overshoot is 0', () => {
    assert.equal(rubberbandOffset(40, 0), 0);
    assert.equal(rubberbandOffset(40, -100), 0);
    assert.equal(rubberbandOffset(0, 600), 0);
  });

  it('applies sub-linear progressive resistance strictly bounded below dimensionPx', () => {
    const dimension = 600;
    const small = rubberbandOffset(50, dimension);
    const medium = rubberbandOffset(200, dimension);
    const huge = rubberbandOffset(50000, dimension);

    assert.ok(small > 0 && small < 50);
    assert.ok(medium > small && medium < 200);
    assert.ok(huge > medium && huge < dimension);

    // Marginal increment decreases as overshoot grows.
    const step1 = rubberbandOffset(100, dimension) - rubberbandOffset(0, dimension);
    const step2 = rubberbandOffset(200, dimension) - rubberbandOffset(100, dimension);
    assert.ok(step2 < step1);
  });

  it('is odd-symmetric for negative overshoot values', () => {
    const dimension = 500;
    assert.equal(rubberbandOffset(-120, dimension), -rubberbandOffset(120, dimension));
  });
});

describe('resolveSheetSnapOrDismiss', () => {
  it('dismisses on a fast downward flick even after a short drag', () => {
    const result = resolveSheetSnapOrDismiss({
      currentTranslateY: 24,
      velocityPxPerSec: 720,
      sheetHeight: 600,
    });

    assert.deepEqual(result, {
      action: 'dismiss',
      targetTranslateY: 600,
      snapIndex: -1,
    });
  });

  it('snaps back to 0 after a short, slow drag', () => {
    const result = resolveSheetSnapOrDismiss({
      currentTranslateY: 95,
      velocityPxPerSec: 40,
      sheetHeight: 600,
    });

    assert.deepEqual(result, {
      action: 'snap',
      targetTranslateY: 0,
      snapIndex: 0,
    });
  });

  it('dismisses when projected position exceeds the dismiss threshold', () => {
    const result = resolveSheetSnapOrDismiss({
      currentTranslateY: 270,
      velocityPxPerSec: 0,
      sheetHeight: 600,
    });

    assert.deepEqual(result, {
      action: 'dismiss',
      targetTranslateY: 600,
      snapIndex: -1,
    });
  });

  it('selects between two snap points [0, 300] using projected momentum', () => {
    // Slow drag closer to the half-open snap point (300) settles at index 1.
    const settleHalf = resolveSheetSnapOrDismiss({
      currentTranslateY: 190,
      velocityPxPerSec: 0,
      sheetHeight: 600,
      snapOffsetsPx: [0, 300],
    });
    assert.deepEqual(settleHalf, {
      action: 'snap',
      targetTranslateY: 300,
      snapIndex: 1,
    });

    // Slow drag closer to fully open (0) settles at index 0.
    const settleFull = resolveSheetSnapOrDismiss({
      currentTranslateY: 110,
      velocityPxPerSec: 0,
      sheetHeight: 600,
      snapOffsetsPx: [0, 300],
    });
    assert.deepEqual(settleFull, {
      action: 'snap',
      targetTranslateY: 0,
      snapIndex: 0,
    });

    // Upward flick from half-open (300) projects upward and expands to full (0).
    const flickUpToFull = resolveSheetSnapOrDismiss({
      currentTranslateY: 260,
      velocityPxPerSec: -1400,
      sheetHeight: 600,
      snapOffsetsPx: [0, 300],
    });
    assert.deepEqual(flickUpToFull, {
      action: 'snap',
      targetTranslateY: 0,
      snapIndex: 0,
    });

    // Downward flick from the lowest snap (300) dismisses instead of snapping back.
    const flickDownFromLowest = resolveSheetSnapOrDismiss({
      currentTranslateY: 315,
      velocityPxPerSec: 700,
      sheetHeight: 600,
      snapOffsetsPx: [0, 300],
    });
    assert.deepEqual(flickDownFromLowest, {
      action: 'dismiss',
      targetTranslateY: 600,
      snapIndex: -1,
    });
  });
});
