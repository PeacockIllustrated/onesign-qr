import { describe, it, expect } from 'vitest';
import { validateUrl } from '@/lib/security/url-validator';

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('accepts a valid HTTPS URL', () => {
      const result = validateUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/');
    });

    it('accepts a valid HTTP URL', () => {
      const result = validateUrl('http://example.com');
      expect(result.isValid).toBe(true);
    });

    it('accepts a URL with a path', () => {
      const result = validateUrl('https://example.com/path/to/page');
      expect(result.isValid).toBe(true);
    });

    it('accepts a URL with query parameters', () => {
      const result = validateUrl('https://example.com/page?foo=bar&baz=qux');
      expect(result.isValid).toBe(true);
    });

    it('accepts a URL with a port number', () => {
      const result = validateUrl('https://example.com:8080/page');
      expect(result.isValid).toBe(true);
    });

    it('trims whitespace from input', () => {
      const result = validateUrl('  https://example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('private IP addresses', () => {
    it('rejects 10.0.0.1 (RFC 1918 Class A)', () => {
      const result = validateUrl('http://10.0.0.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects 172.16.0.1 (RFC 1918 Class B)', () => {
      const result = validateUrl('http://172.16.0.1');
      expect(result.isValid).toBe(false);
    });

    it('rejects 192.168.1.1 (RFC 1918 Class C)', () => {
      const result = validateUrl('http://192.168.1.1');
      expect(result.isValid).toBe(false);
    });

    it('rejects 127.0.0.1 (loopback)', () => {
      const result = validateUrl('http://127.0.0.1');
      expect(result.isValid).toBe(false);
    });
  });

  describe('metadata endpoints', () => {
    it('rejects AWS/GCP metadata endpoint (169.254.169.254)', () => {
      const result = validateUrl('http://169.254.169.254/latest/meta-data/');
      expect(result.isValid).toBe(false);
    });
  });

  describe('dangerous protocols', () => {
    it('rejects javascript: URLs', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('rejects data: URLs', () => {
      const result = validateUrl('data:text/html,<h1>hello</h1>');
      expect(result.isValid).toBe(false);
    });
  });

  describe('embedded credentials', () => {
    it('rejects URLs with username and password', () => {
      const result = validateUrl('https://user:pass@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('rejects URLs with username only', () => {
      const result = validateUrl('https://user@example.com');
      expect(result.isValid).toBe(false);
    });
  });

  describe('single-label hostnames', () => {
    // Note: single-label hostname rejection is in validateUrlStrict, not validateUrl.
    // validateUrl itself checks blocked hostnames but not single-label explicitly.
    // The URL constructor may reject some of these, or they may be caught by
    // the blocked hostname check (e.g. 'localhost').
    it('rejects localhost', () => {
      const result = validateUrl('http://localhost');
      expect(result.isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects empty input', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL is required');
    });

    it('rejects whitespace-only input', () => {
      const result = validateUrl('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL is required');
    });

    it('rejects URLs that exceed maximum length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      const result = validateUrl(longUrl);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('rejects malformed URLs', () => {
      const result = validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });
});
