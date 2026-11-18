import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateHorizontalSwipeCommit,
  rotateDeferredQueue,
} from '../src/hooks/useSwipeTriage.ts';

describe('evaluateHorizontalSwipeCommit', () => {
  it('commits include on a fast short rightward flick past the 24px displacement guard', () => {
    const decision = evaluateHorizontalSwipeCommit({
      dx: 36,
      velocityPxPerSec: 1100,
      cardWidth: 360,
    });
    assert.equal(decision, 'include');
  });

  it('commits exclude on a fast short leftward flick past the -24px displacement guard', () => {
    const decision = evaluateHorizontalSwipeCommit({
      dx: -36,
      velocityPxPerSec: -1100,
      cardWidth: 360,
    });
    assert.equal(decision, 'exclude');
  });

  it('cancels a slow short drag that projects below threshold', () => {
    const rightCancel = evaluateHorizontalSwipeCommit({
      dx: 65,
      velocityPxPerSec: 120,
      cardWidth: 360,
    });
    const leftCancel = evaluateHorizontalSwipeCommit({
      dx: -65,
      velocityPxPerSec: -120,
      cardWidth: 360,
    });
    assert.equal(rightCancel, 'cancel');
    assert.equal(leftCancel, 'cancel');
  });

  it('commits on a slow long drag past cardWidth * thresholdRatio', () => {
    // cardWidth 400 * 0.32 = 128px threshold
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: 132, velocityPxPerSec: 0, cardWidth: 400 }),
      'include'
    );
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: -132, velocityPxPerSec: 0, cardWidth: 400 }),
      'exclude'
    );
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: 120, velocityPxPerSec: 0, cardWidth: 400 }),
      'cancel'
    );
  });

  it('enforces the 110px minimum threshold even on narrow cards', () => {
    // 260 * 0.32 = 83.2 -> clamped to 110px minimum
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: 95, velocityPxPerSec: 0, cardWidth: 260 }),
      'cancel'
    );
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: 112, velocityPxPerSec: 0, cardWidth: 260 }),
      'include'
    );
  });

  it('cancels when displacement is opposite to release velocity', () => {
    // User dragged right (+55px) then snapped back left (-2400 px/s -> projectedX = -182.6px),
    // which must cancel rather than accidentally excluding because dx > -24 is false.
    assert.equal(
      evaluateHorizontalSwipeCommit({
        dx: 55,
        velocityPxPerSec: -2400,
        cardWidth: 360,
      }),
      'cancel'
    );

    // Symmetric reverse case: dragged left (-55px) then snapped back right (+2400 px/s).
    assert.equal(
      evaluateHorizontalSwipeCommit({
        dx: -55,
        velocityPxPerSec: 2400,
        cardWidth: 360,
      }),
      'cancel'
    );
  });

  it('cancels tiny nudges within +-24px regardless of velocity', () => {
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: 20, velocityPxPerSec: 3000, cardWidth: 360 }),
      'cancel'
    );
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: -24, velocityPxPerSec: -3000, cardWidth: 360 }),
      'cancel'
    );
  });

  it('guards non-finite numbers and invalid deceleration rates safely', () => {
    assert.equal(
      evaluateHorizontalSwipeCommit({ dx: Number.NaN, velocityPxPerSec: 900, cardWidth: 360 }),
      'cancel'
    );
    assert.equal(
      evaluateHorizontalSwipeCommit({
        dx: 40,
        velocityPxPerSec: Number.POSITIVE_INFINITY,
        cardWidth: 360,
      }),
      'cancel'
    );
    assert.equal(
      evaluateHorizontalSwipeCommit({
        dx: 40,
        velocityPxPerSec: 2000,
        cardWidth: 360,
        decelerationRate: 1,
      }),
      'cancel'
    );
  });
});

describe('rotateDeferredQueue', () => {
  it('preserves pending order when nothing is deferred without mutating inputs', () => {
    const pending = ['p1', 'p2', 'p3'];
    const deferred: string[] = [];
    const rotated = rotateDeferredQueue(pending, deferred);
    assert.deepEqual(rotated, ['p1', 'p2', 'p3']);
    assert.notEqual(rotated, pending);
  });

  it('moves deferred studies to the tail in FIFO defer order', () => {
    const rotated = rotateDeferredQueue(['p1', 'p2', 'p3', 'p4'], ['p2', 'p1']);
    assert.deepEqual(rotated, ['p3', 'p4', 'p2', 'p1']);
  });

  it('ignores deferred IDs no longer pending and deduplicates repeated entries', () => {
    const rotated = rotateDeferredQueue(['p2', 'p3', 'p4'], ['p1', 'p3', 'p3', 'p99']);
    assert.deepEqual(rotated, ['p2', 'p4', 'p3']);
  });

  it('returns empty array when no pending IDs exist', () => {
    assert.deepEqual(rotateDeferredQueue([], ['p1', 'p2']), []);
  });
});
