import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseNativeShare,
  copyTextSafely,
  shareTextSafely,
} from '../src/utils/fileDownload.ts';
import {
  LIGHT_THEME_SVG_FALLBACKS,
  resolveSvgCssVariables,
  serializeThemedSvg,
} from '../src/utils/svgSerializer.ts';

function withMockedGlobals(
  overrides: { navigator?: unknown; document?: unknown },
  fn: () => Promise<void> | void
): Promise<void> | void {
  const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const docDesc = Object.getOwnPropertyDescriptor(globalThis, 'document');

  if ('navigator' in overrides) {
    Object.defineProperty(globalThis, 'navigator', {
      value: overrides.navigator,
      configurable: true,
      writable: true,
    });
  }
  if ('document' in overrides) {
    Object.defineProperty(globalThis, 'document', {
      value: overrides.document,
      configurable: true,
      writable: true,
    });
  }

  const restore = () => {
    if (navDesc) {
      Object.defineProperty(globalThis, 'navigator', navDesc);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
    if (docDesc) {
      Object.defineProperty(globalThis, 'document', docDesc);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  };

  try {
    const result = fn();
    if (result && typeof (result as Promise<void>).then === 'function') {
      return (result as Promise<void>).finally(restore);
    }
    restore();
    return result;
  } catch (err) {
    restore();
    throw err;
  }
}

test('canUseNativeShare reflects navigator.share availability', () => {
  withMockedGlobals({ navigator: undefined }, () => {
    assert.equal(canUseNativeShare(), false);
  });
  withMockedGlobals({ navigator: { share: async () => {} } }, () => {
    assert.equal(canUseNativeShare(), true);
  });
});

test('copyTextSafely uses navigator.clipboard.writeText when available', async () => {
  let written = '';
  await withMockedGlobals(
    {
      navigator: {
        clipboard: {
          writeText: async (text: string) => {
            written = text;
          },
        },
      },
      document: undefined,
    },
    async () => {
      const ok = await copyTextSafely('DOI: 10.1000/xyz');
      assert.equal(ok, true);
      assert.equal(written, 'DOI: 10.1000/xyz');
    }
  );
});

test('copyTextSafely falls back to invisible textarea + execCommand when clipboard fails', async () => {
  const appended: unknown[] = [];
  const removed: unknown[] = [];
  let execCommandCalledWith = '';

  const mockTextarea = {
    value: '',
    style: {} as Record<string, string>,
    attributes: {} as Record<string, string>,
    parentNode: null as unknown,
    setAttribute(k: string, v: string) {
      this.attributes[k] = v;
    },
    focus() {},
    select() {},
    setSelectionRange() {},
  };

  const mockBody = {
    appendChild(el: typeof mockTextarea) {
      el.parentNode = mockBody;
      appended.push(el);
    },
    removeChild(el: typeof mockTextarea) {
      el.parentNode = null;
      removed.push(el);
    },
  };

  await withMockedGlobals(
    {
      navigator: {
        clipboard: {
          writeText: async () => {
            throw new Error('NotAllowedError');
          },
        },
      },
      document: {
        body: mockBody,
        createElement(tag: string) {
          assert.equal(tag, 'textarea');
          return mockTextarea;
        },
        execCommand(cmd: string) {
          execCommandCalledWith = cmd;
          return true;
        },
      },
    },
    async () => {
      const ok = await copyTextSafely('fallback payload');
      assert.equal(ok, true);
      assert.equal(execCommandCalledWith, 'copy');
      assert.equal(mockTextarea.value, 'fallback payload');
      assert.equal(mockTextarea.style.fontSize, '16px');
      assert.equal(mockTextarea.style.position, 'fixed');
      assert.equal(mockTextarea.style.opacity, '0');
      assert.equal(appended.length, 1);
      assert.equal(removed.length, 1);
    }
  );
});

test('copyTextSafely returns false safely when no clipboard and no DOM are available', async () => {
  await withMockedGlobals({ navigator: undefined, document: undefined }, async () => {
    const ok = await copyTextSafely('unavail');
    assert.equal(ok, false);
  });
});

test('shareTextSafely handles share success, AbortError cancellation, and clipboard fallback', async () => {
  let sharedPayload: Record<string, string> | null = null;
  await withMockedGlobals(
    {
      navigator: {
        share: async (data: Record<string, string>) => {
          sharedPayload = data;
        },
      },
    },
    async () => {
      const status = await shareTextSafely('Paper', 'Summary', 'https://example.org');
      assert.equal(status, 'shared');
      assert.deepEqual(sharedPayload, {
        title: 'Paper',
        text: 'Summary',
        url: 'https://example.org',
      });
    }
  );

  await withMockedGlobals(
    {
      navigator: {
        share: async () => {
          const err = new Error('User cancelled');
          err.name = 'AbortError';
          throw err;
        },
      },
    },
    async () => {
      const status = await shareTextSafely('Paper', 'Summary');
      assert.equal(status, 'cancelled');
    }
  );

  let copiedText = '';
  await withMockedGlobals(
    {
      navigator: {
        clipboard: {
          writeText: async (txt: string) => {
            copiedText = txt;
          },
        },
      },
      document: undefined,
    },
    async () => {
      const status = await shareTextSafely('Paper', 'Summary', 'https://example.org/doc');
      assert.equal(status, 'copied');
      assert.equal(copiedText, 'Summary\nhttps://example.org/doc');
    }
  );

  await withMockedGlobals({ navigator: undefined, document: undefined }, async () => {
    const status = await shareTextSafely('Paper', 'Summary');
    assert.equal(status, 'failed');
  });
});

test('resolveSvgCssVariables resolves light theme fallback tokens and currentColor', () => {
  const input =
    '<svg viewBox="0 0 10 10"><rect fill="var(--bg-secondary)" stroke="var(--divider)" /><text fill="var(--text-primary)" color="currentColor">A</text><path fill="var(--chart-1)" stroke="var(--unknown-var, #ABCDEF)" /></svg>';

  const output = resolveSvgCssVariables(input);

  assert.equal(output.includes('var(--bg-secondary)'), false);
  assert.equal(output.includes('var(--divider)'), false);
  assert.equal(output.includes('var(--text-primary)'), false);
  assert.equal(output.includes('var(--chart-1)'), false);
  assert.equal(output.includes('currentColor'), false);
  assert.ok(output.includes(`fill="${LIGHT_THEME_SVG_FALLBACKS['--bg-secondary']}"`));
  assert.ok(output.includes(`stroke="${LIGHT_THEME_SVG_FALLBACKS['--divider']}"`));
  assert.ok(output.includes(`fill="${LIGHT_THEME_SVG_FALLBACKS['--text-primary']}"`));
  assert.ok(output.includes('color="#111827"'));
  assert.ok(output.includes(`fill="${LIGHT_THEME_SVG_FALLBACKS['--chart-1']}"`));
  assert.ok(output.includes('stroke="#ABCDEF"'));
});

test('serializeThemedSvg ensures xmlns and resolves CSS variables cleanly in fallback mode', async () => {
  await withMockedGlobals({ document: undefined }, () => {
    const fakeSvg = {
      outerHTML:
        '<svg viewBox="0 0 100 100"><rect fill="var(--bg-canvas)" stroke="var(--link-academic)" /><path stroke="currentColor" /></svg>',
    } as unknown as SVGSVGElement;

    const result = serializeThemedSvg(fakeSvg);
    assert.ok(result.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(result.includes('fill="#FFFFFF"'));
    assert.ok(result.includes('stroke="#1A56DB"'));
    assert.ok(result.includes('stroke="#111827"'));
  });
});
