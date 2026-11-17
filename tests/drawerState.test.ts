import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDrawerState, serializeDrawerState } from '../src/utils/layoutPreferences.ts';

const SAVED_DEFAULTS = { sort: true, slots: true, defaultTarget: true, newGroup: true, backup: false };

test('parseDrawerState returns the defaults when nothing usable is stored', () => {
  for (const raw of [null, '', '{not json', '42', 'null', '"text"', '[true,false]']) {
    assert.deepEqual(parseDrawerState(raw, SAVED_DEFAULTS), SAVED_DEFAULTS, `raw=${String(raw)}`);
  }
});

test('parseDrawerState keeps stored booleans and defaults the rest', () => {
  const parsed = parseDrawerState(
    JSON.stringify({ sort: false, backup: true, newGroup: 'yes', legacyDrawer: false }),
    SAVED_DEFAULTS
  );
  assert.deepEqual(parsed, { sort: false, slots: true, defaultTarget: true, newGroup: true, backup: true });
  assert.equal('legacyDrawer' in parsed, false);
});

test('parseDrawerState does not mutate the defaults object', () => {
  const defaults = { sort: true, areas: true };
  const parsed = parseDrawerState('{"sort":false}', defaults);
  assert.deepEqual(defaults, { sort: true, areas: true });
  assert.notEqual(parsed, defaults);
});

test('serializeDrawerState round-trips through parseDrawerState', () => {
  const state = { sort: false, presets: true, categories: false, access: true, areas: false };
  const defaults = { sort: true, presets: true, categories: true, access: true, areas: true };
  assert.deepEqual(parseDrawerState(serializeDrawerState(state), defaults), state);
});
