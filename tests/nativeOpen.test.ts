import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNativeOpenCommand } from '../server/nativeOpen.mjs';

const SCHOLAR_URL = 'https://scholar.google.com/scholar?q=machine%20learning&hl=pt-BR&as_ylo=2020';

test('Windows opens URLs through rundll32 without cmd.exe, keeping every query parameter', () => {
  const cmd = buildNativeOpenCommand(SCHOLAR_URL, 'win32');
  assert.equal(cmd.ok, true);
  if (!cmd.ok) return;
  assert.equal(cmd.file, 'rundll32.exe');
  assert.deepEqual(cmd.args, ['url.dll,FileProtocolHandler', SCHOLAR_URL]);
  assert.equal(cmd.args.some((arg: string) => /cmd(\.exe)?$|^\/c$|^start$/i.test(arg)), false);
});

test('macOS and Linux keep their native openers', () => {
  const mac = buildNativeOpenCommand(SCHOLAR_URL, 'darwin');
  const linux = buildNativeOpenCommand(SCHOLAR_URL, 'linux');
  assert.deepEqual(mac.ok && { file: mac.file, args: mac.args }, { file: 'open', args: [SCHOLAR_URL] });
  assert.deepEqual(linux.ok && { file: linux.file, args: linux.args }, {
    file: 'xdg-open',
    args: [SCHOLAR_URL],
  });
});

test('shell metacharacters and quotes cannot split the argument', () => {
  const cmd = buildNativeOpenCommand('https://example.org/a b?x=1&y="2"|calc^', 'win32');
  assert.equal(cmd.ok, true);
  if (!cmd.ok) return;
  assert.equal(cmd.args.length, 2);
  assert.equal(/[\s"]/.test(cmd.args[1]), false);
  assert.ok(cmd.args[1].includes('&y='));
});

test('non-http(s) and malformed URLs are rejected before any process is spawned', () => {
  for (const bad of ['javascript:alert(1)', 'file:///C:/Windows/System32/calc.exe', 'not a url', '']) {
    const cmd = buildNativeOpenCommand(bad, 'win32');
    assert.equal(cmd.ok, false, `accepted: ${bad}`);
  }
});
