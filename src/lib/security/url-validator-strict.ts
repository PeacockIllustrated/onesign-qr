import 'server-only';
import { validateUrl, isPrivateIp, type UrlValidationResult } from './url-validator';

/**
 * Validate URL with additional DNS resolution check.
 * Use this for stricter validation when creating QR codes.
 *
 * Resolves the hostname via DNS and verifies that none of the returned
 * IP addresses are in private ranges — this prevents SSRF via domains
 * that resolve to internal IPs (e.g., attacker registers evil.com -> 169.254.169.254).
 *
 * Server-only — uses `dns/promises` which is Node-only and would otherwise
 * trip Turbopack's static analysis when the basic url-validator is also
 * imported into client components.
 */
export async function validateUrlStrict(input: string): Promise<UrlValidationResult> {
  // First do basic validation
  const basicResult = validateUrl(input);
  if (!basicResult.isValid) {
    return basicResult;
  }

  const url = new URL(basicResult.normalizedUrl!);

  // Additional check: ensure the hostname has at least one dot
  if (!url.hostname.includes('.')) {
    return {
      isValid: false,
      error: 'Single-label hostnames are not allowed',
    };
  }

  // If the hostname is already an IP literal, it was already checked by
  // isPrivateIp inside validateUrl — skip DNS resolution
  if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.startsWith('[')) {
    return basicResult;
  }

  // DNS resolution check — resolve the hostname and verify all IPs are public
  try {
    const { resolve4, resolve6 } = await import('dns/promises');
    const [ipv4Result, ipv6Result] = await Promise.allSettled([
      resolve4(url.hostname),
      resolve6(url.hostname),
    ]);

    const allIps: string[] = [];
    if (ipv4Result.status === 'fulfilled') allIps.push(...ipv4Result.value);
    if (ipv6Result.status === 'fulfilled') allIps.push(...ipv6Result.value);

    if (allIps.length === 0) {
      return { isValid: false, error: 'Domain does not resolve to any IP address' };
    }

    for (const ip of allIps) {
      if (isPrivateIp(ip)) {
        return {
          isValid: false,
          error: 'URL resolves to a private or reserved IP address',
        };
      }
    }
  } catch {
    return { isValid: false, error: 'Failed to resolve domain' };
  }

  return basicResult;
}
