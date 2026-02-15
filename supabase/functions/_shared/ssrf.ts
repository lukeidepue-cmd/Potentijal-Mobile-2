/**
 * SSRF-safe fetch for user-supplied URLs (4.1 M1).
 * Use when adding "import from URL," link preview, or any backend that fetches user-provided URLs.
 *
 * - Allowlist: only hostnames in allowedHosts (exact or suffix match).
 * - IPs: reject hostnames that are IP addresses (v4/v6) to avoid private/link-local/metadata bypass.
 * - Timeout and response size limit.
 * - Redirect: manual then re-check allowlist on Location (or disable follow).
 */

export interface SafeFetchOptions {
  /** Allowed hostnames: exact or suffix match (e.g. "cdn.example.com" or ".example.com" for *.example.com). */
  allowedHosts: string[];
  /** Request timeout in ms. */
  timeoutMs?: number;
  /** Max response body size in bytes. */
  maxBodyBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BODY_BYTES = 512 * 1024; // 512 KB

/** Hostname that looks like an IPv4 address. */
const IS_IPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function isAllowedHost(hostname: string, allowedHosts: string[]): boolean {
  const lower = hostname.toLowerCase().replace(/^\.+/, "");
  for (const allowed of allowedHosts) {
    const a = allowed.toLowerCase().trim();
    if (a.startsWith(".")) {
      if (lower === a.slice(1) || lower.endsWith(a)) return true;
    } else {
      if (lower === a || lower.endsWith("." + a)) return true;
    }
  }
  return false;
}

/** Reject IP hosts (v4/v6) and localhost so only allowlisted hostnames are used (blocks RFC1918, link-local, metadata, and public IP SSRF). */
function isBlockedIpOrLocalHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "::1") return true;
  if (IS_IPv4.test(hostname)) return true;
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  if (/^[\da-f:]+$/i.test(hostname)) return true; // bare IPv6
  return false;
}

/**
 * Fetch a URL only if it passes SSRF checks: allowlist, no private/link-local/metadata IPs, timeout, optional body limit.
 * Use for any request where the URL (or redirect target) comes from the user.
 *
 * @param input - URL string (user-supplied or derived).
 * @param options - allowedHosts (required), timeoutMs, maxBodyBytes.
 * @param init - Optional RequestInit (method, headers, etc.). Do not pass user-controlled body blindly.
 * @returns Response (body may be truncated if maxBodyBytes set).
 * @throws Error if URL is not allowed or fetch fails.
 */
export async function safeFetch(
  input: string,
  options: SafeFetchOptions,
  init?: RequestInit
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (isBlockedIpOrLocalHost(hostname)) {
    throw new Error("URL host not allowed");
  }

  if (!isAllowedHost(hostname, options.allowedHosts)) {
    throw new Error("URL host not in allowlist");
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(to);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("Location");
      if (loc) {
        const nextUrl = new URL(loc, url);
        const nextHost = nextUrl.hostname.replace(/^\[|\]$/g, "");
        if (isBlockedIpOrLocalHost(nextHost) || !isAllowedHost(nextHost, options.allowedHosts)) {
          throw new Error("Redirect target not allowed");
        }
        return safeFetch(nextUrl.toString(), options, init);
      }
    }

    const contentType = res.headers.get("content-type") || "";
    if (maxBodyBytes > 0 && res.body) {
      const reader = res.body.getReader();
      let total = 0;
      const chunks: Uint8Array[] = [];
      while (total < maxBodyBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBodyBytes) {
          chunks.push(value.subarray(0, value.length - (total - maxBodyBytes)));
          break;
        }
        chunks.push(value);
      }
      const body = new Uint8Array(
        chunks.reduce((acc, c) => acc + c.length, 0)
      );
      let off = 0;
      for (const c of chunks) {
        body.set(c, off);
        off += c.length;
      }
      return new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    return res;
  } catch (e) {
    clearTimeout(to);
    if (e instanceof Error) throw e;
    throw new Error("Fetch failed");
  }
}
