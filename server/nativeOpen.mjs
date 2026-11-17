/**
 * Builds the OS command that opens an http(s) URL in the user's default browser.
 *
 * Windows uses `rundll32 url.dll,FileProtocolHandler <url>` so the URL never passes through
 * cmd.exe. With `cmd /c start "" <url>`, Node does not quote arguments that lack spaces, and
 * cmd.exe treats `&`, `|`, `^`, `<`, `>` and `%VAR%` in the query string as shell syntax:
 * the URL is truncated at the first `&` and the remainder runs as a separate command.
 *
 * Pure function (no side effects) so it can be unit-tested on any host OS.
 *
 * @param {string} rawUrl
 * @param {string} platform value of `process.platform`
 * @returns {{ ok: true, url: string, file: string, args: string[] } | { ok: false, url: string, error: string }}
 */
export function buildNativeOpenCommand(rawUrl, platform) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch {
    return { ok: false, url: String(rawUrl), error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, url: String(rawUrl), error: 'Unsupported protocol' };
  }

  // WHATWG serialization percent-encodes spaces and double quotes, so the argument
  // reaches the opener as a single token without extra quoting.
  const url = parsed.toString();

  if (platform === 'win32') {
    return { ok: true, url, file: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] };
  }
  if (platform === 'darwin') {
    return { ok: true, url, file: 'open', args: [url] };
  }
  return { ok: true, url, file: 'xdg-open', args: [url] };
}
