import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeExternalUrl } from '../src/utils/urlSafety.ts';

test('sanitizeExternalUrl accepts valid http and https URLs', () => {
  assert.equal(sanitizeExternalUrl('https://openalex.org/W123'), 'https://openalex.org/W123');
  assert.equal(sanitizeExternalUrl(' http://arxiv.org/abs/2401.00001 '), 'http://arxiv.org/abs/2401.00001');
  assert.equal(
    sanitizeExternalUrl('doi.org/10.1000/xyz', { allowImplicitHttps: true }),
    'https://doi.org/10.1000/xyz'
  );
});

test('sanitizeExternalUrl blocks dangerous schemes and protocol-relative URLs', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeExternalUrl('vbscript:msgbox(1)'), null);
  assert.equal(sanitizeExternalUrl('file:///etc/passwd'), null);
  assert.equal(sanitizeExternalUrl('//evil.example/payload', { allowImplicitHttps: true }), null);
  assert.equal(sanitizeExternalUrl(''), null);
  assert.equal(sanitizeExternalUrl(null), null);
});
