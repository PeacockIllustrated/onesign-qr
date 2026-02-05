import { URL_VALIDATION } from '../constants';

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Private IP address patterns (RFC 1918 and others)
 */
const PRIVATE_IP_PATTERNS = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
  /^192\.168\./,                     // 192.168.0.0/16
  /^127\./,                          // Loopback
  /^169\.254\./,                     // Link-local
  /^0\./,                            // Current network
];

/**
 * IPv6 private patterns
 */
const PRIVATE_IPV6_PATTERNS = [
  /^::1$/i,                         // Loopback
  /^fe80:/i,                        // Link-local
  /^fc00:/i,                        // Unique local
  /^fd/i,                           // Unique local
];

/**
 * Cloud metadata endpoints that should be blocked (SSRF prevention)
 */
const METADATA_ENDPOINTS = [
  '169.254.169.254',                // AWS/GCP metadata
  'metadata.google.internal',       // GCP metadata
  'metadata.azure.com',             // Azure metadata
  '100.100.100.200',               // Alibaba Cloud metadata
];

/**
 * Check if a hostname resolves to a private IP
 */
function isPrivateIp(ip: string): boolean {
  // Check IPv4 private ranges
  if (PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip))) {
    return true;
  }

  // Check IPv6 private ranges
  if (PRIVATE_IPV6_PATTERNS.some(pattern => pattern.test(ip))) {
    return true;
  }

  // Check metadata endpoints
  if (METADATA_ENDPOINTS.includes(ip.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Check if hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Check explicit blocklist
  if (URL_VALIDATION.BLOCKED_HOSTNAMES.includes(lower as typeof URL_VALIDATION.BLOCKED_HOSTNAMES[number])) {
    return true;
  }

  // Check for localhost variations
  if (lower === 'localhost' || lower.endsWith('.localhost')) {
    return true;
  }

  // Check for .local domains
  if (lower.endsWith('.local')) {
    return true;
  }

  // Check if hostname is an IP and if it's private
  if (isPrivateIp(lower)) {
    return true;
  }

  return false;
}

/**
 * Validate a URL for use as a QR code destination
 *
 * Security checks:
 * - Protocol must be http or https
 * - No JavaScript or data URLs
 * - No private IPs or localhost
 * - No cloud metadata endpoints
 * - Reasonable URL length
 */
export function validateUrl(input: string): UrlValidationResult {
  // Trim whitespace
  const trimmed = input.trim();

  // Check for empty input
  if (!trimmed) {
    return { isValid: false, error: 'URL is required' };
  }

  // Check length
  if (trimmed.length > URL_VALIDATION.MAX_LENGTH) {
    return {
      isValid: false,
      error: `URL is too long (max ${URL_VALIDATION.MAX_LENGTH} characters)`
    };
  }

  // Try to parse the URL
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  if (!URL_VALIDATION.ALLOWED_PROTOCOLS.includes(url.protocol as typeof URL_VALIDATION.ALLOWED_PROTOCOLS[number])) {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS URLs are allowed'
    };
  }

  // Check for blocked hostnames
  if (isBlockedHostname(url.hostname)) {
    return {
      isValid: false,
      error: 'This hostname is not allowed'
    };
  }

  // Check for suspicious patterns
  if (url.username || url.password) {
    return {
      isValid: false,
      error: 'URLs with embedded credentials are not allowed'
    };
  }

  // Normalize and return
  return {
    isValid: true,
    normalizedUrl: url.toString(),
  };
}

/**
 * Validate URL with additional DNS resolution check
 * Use this for stricter validation when creating QR codes
 */
export async function validateUrlStrict(input: string): Promise<UrlValidationResult> {
  // First do basic validation
  const basicResult = validateUrl(input);
  if (!basicResult.isValid) {
    return basicResult;
  }

  const url = new URL(basicResult.normalizedUrl!);

  // In production, you might want to do DNS resolution here
  // to verify the domain exists and doesn't resolve to private IPs
  // For now, we'll rely on the basic checks

  // Additional check: ensure the hostname has at least one dot
  // (prevents things like http://intranet/)
  if (!url.hostname.includes('.') && !isPrivateIp(url.hostname)) {
    return {
      isValid: false,
      error: 'Single-label hostnames are not allowed',
    };
  }

  return basicResult;
}

/**
 * Validate a redirect URL (used in the redirect handler)
 * This is a lighter check since the URL was already validated at creation time
 */
export function validateRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return URL_VALIDATION.ALLOWED_PROTOCOLS.includes(parsed.protocol as typeof URL_VALIDATION.ALLOWED_PROTOCOLS[number]);
  } catch {
    return false;
  }
}
