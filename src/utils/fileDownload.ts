export type ShareOrDownloadResult = 'shared' | 'downloaded' | 'cancelled';

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true;
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: unknown }).name === 'AbortError'
  );
}

/**
 * Saves a text payload through a temporary object URL. Kept dependency-free so the
 * ErrorBoundary can use it without pulling the citation exporters into the main chunk.
 */
export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  const timer = setTimeout(() => URL.revokeObjectURL(url), 10_000);
  if (
    typeof timer === 'object' &&
    timer !== null &&
    'unref' in timer &&
    typeof (timer as { unref?: () => void }).unref === 'function'
  ) {
    (timer as { unref: () => void }).unref();
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareOrDownloadFile(
  filename: string,
  content: string,
  mimeType: string,
  title?: string
): Promise<ShareOrDownloadResult> {
  if (
    typeof File !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      const file = new File([content], filename, { type: mimeType });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share(title ? { files: [file], title } : { files: [file] });
        return 'shared';
      }
    } catch (err) {
      if (isAbortError(err)) {
        return 'cancelled';
      }
    }
  }

  triggerFileDownload(filename, content, mimeType);
  return 'downloaded';
}

export async function copyTextSafely(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to legacy selection copy below.
    }
  }

  if (typeof document === 'undefined' || !document.body) {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.style.fontSize = '16px';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    if (typeof textarea.setSelectionRange === 'function') {
      textarea.setSelectionRange(0, text.length);
    }
    if (typeof document.execCommand !== 'function') {
      return false;
    }
    return Boolean(document.execCommand('copy'));
  } catch {
    return false;
  } finally {
    if (textarea.parentNode === document.body) {
      document.body.removeChild(textarea);
    } else if (typeof textarea.remove === 'function') {
      textarea.remove();
    }
  }
}

export async function shareTextSafely(
  title: string,
  text: string,
  url?: string
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, ...(url ? { url } : {}) });
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) {
        return 'cancelled';
      }
    }
  }

  const copied = await copyTextSafely(url ? `${text}\n${url}` : text);
  return copied ? 'copied' : 'failed';
}
