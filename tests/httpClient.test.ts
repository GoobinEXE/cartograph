import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_PROXY_ORIGIN,
  HttpStatusError,
  crossPlatformFetch,
  fetchJsonDirect,
} from '../src/services/httpClient.ts';

// Node has no `window`: isTauriRuntime() is false and the current origin is null, so the
// candidate order is same-origin proxy, cloud proxy, then the direct upstream URL.

const PROXY_PATH = '/api/academic-proxy?provider=openalex&q=test';
const DIRECT_URL = 'https://api.openalex.org/works?search=test';
const CLOUD_URL = `${CLOUD_PROXY_ORIGIN}${PROXY_PATH}`;

type FetchStep = Response | Error;

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** Replaces fetch with a scripted sequence: each call consumes one step (a response or a thrown error). */
function stubFetch(steps: readonly FetchStep[]): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init });
    const step = steps[calls.length - 1];
    if (step === undefined) throw new Error(`unexpected fetch #${calls.length}: ${String(input)}`);
    if (step instanceof Error) throw step;
    return step;
  }) as typeof fetch;
  return calls;
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function htmlResponse(): Response {
  return new Response('<!doctype html><title>SPA</title>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function isHttpStatus(status: number) {
  return (err: unknown): boolean => {
    assert.ok(err instanceof HttpStatusError);
    assert.equal(err.status, status);
    return true;
  };
}

test('crossPlatformFetch returns the same-origin proxy JSON response without further requests', async () => {
  const proxied = jsonResponse(200, { results: [] });
  const calls = stubFetch([proxied]);

  const res = await crossPlatformFetch(PROXY_PATH, DIRECT_URL);

  assert.equal(res, proxied);
  assert.deepEqual(
    calls.map((c) => c.url),
    [PROXY_PATH]
  );
});

test('crossPlatformFetch skips the cloud proxy after a proxy JSON error and reports it if direct is blocked', async () => {
  const calls = stubFetch([jsonResponse(429, { error: 'rate limited' }), new TypeError('Failed to fetch')]);

  await assert.rejects(crossPlatformFetch(PROXY_PATH, DIRECT_URL), isHttpStatus(429));
  assert.deepEqual(
    calls.map((c) => c.url),
    [PROXY_PATH, DIRECT_URL]
  );
});

test('crossPlatformFetch recovers through the direct URL when the proxy rejects the request', async () => {
  // e.g. a Boolean query longer than the proxy limit (400) or an upstream blocking server IPs (403)
  const direct = jsonResponse(200, { results: [1] });
  const calls = stubFetch([jsonResponse(400, { error: 'query too long' }), direct]);

  const res = await crossPlatformFetch(PROXY_PATH, DIRECT_URL);
  assert.equal(res, direct);
  assert.equal(calls.length, 2);
});

test('crossPlatformFetch reports the direct status when the upstream itself answers with an error', async () => {
  stubFetch([jsonResponse(403, { error: 'blocked' }), jsonResponse(404)]);
  await assert.rejects(crossPlatformFetch(PROXY_PATH, DIRECT_URL), isHttpStatus(404));
});

test('crossPlatformFetch moves to the cloud proxy when the same origin answers with HTML', async () => {
  const cloud = jsonResponse(200, { results: [] });
  const calls = stubFetch([htmlResponse(), cloud]);

  const res = await crossPlatformFetch(PROXY_PATH, DIRECT_URL);

  assert.equal(res, cloud);
  assert.deepEqual(
    calls.map((c) => c.url),
    [PROXY_PATH, CLOUD_URL]
  );
});

test('crossPlatformFetch falls back to the direct URL when both proxies fail at the network level', async () => {
  const direct = jsonResponse(200, { results: [] });
  const calls = stubFetch([new TypeError('fetch failed'), new TypeError('fetch failed'), direct]);

  const res = await crossPlatformFetch(PROXY_PATH, DIRECT_URL);

  assert.equal(res, direct);
  assert.deepEqual(
    calls.map((c) => c.url),
    [PROXY_PATH, CLOUD_URL, DIRECT_URL]
  );
});

test('crossPlatformFetch rejects with HttpStatusError when the direct URL returns 503', async () => {
  const calls = stubFetch([htmlResponse(), htmlResponse(), jsonResponse(503)]);

  await assert.rejects(crossPlatformFetch(PROXY_PATH, DIRECT_URL), isHttpStatus(503));
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url, DIRECT_URL);
});

test('crossPlatformFetch rejects an already-aborted signal without calling fetch', async () => {
  const calls = stubFetch([]);
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(crossPlatformFetch(PROXY_PATH, DIRECT_URL, { signal: controller.signal }), {
    name: 'AbortError',
  });
  assert.equal(calls.length, 0);
});

test('fetchJsonDirect parses JSON and merges caller headers with Accept', async () => {
  const calls = stubFetch([jsonResponse(200, { message: 'ok' })]);

  const data = await fetchJsonDirect(DIRECT_URL, 'OpenAlex', { headers: { 'x-api-key': 'test-key' } });

  assert.deepEqual(data, { message: 'ok' });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].init?.headers, { Accept: 'application/json', 'x-api-key': 'test-key' });
});

test('fetchJsonDirect reports non-OK responses as "<label> HTTP <status>"', async () => {
  stubFetch([jsonResponse(404, { error: 'not found' })]);

  await assert.rejects(fetchJsonDirect(DIRECT_URL, 'OpenAlex'), (err: unknown) => {
    assert.ok(err instanceof HttpStatusError);
    assert.equal(err.status, 404);
    assert.equal(err.message, 'OpenAlex HTTP 404');
    return true;
  });
});
