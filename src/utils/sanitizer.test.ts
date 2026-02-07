import { describe, it, expect } from 'vitest';
import { sanitizeUserInput, sanitizeHTML } from './sanitizer';

describe('sanitizer', () => {
  describe('sanitizeUserInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeUserInput('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeUserInput('<b>Bold</b> text')).toBe('Bold text');
      expect(sanitizeUserInput('<div>Content</div>')).toBe('Content');
    });

    it('should remove dangerous scripts', () => {
      expect(sanitizeUserInput('Hello<script>alert(1)</script>World')).toBe('HelloWorld');
    });

    it('should handle nested tags', () => {
      expect(sanitizeUserInput('<div><span>Text</span></div>')).toBe('Text');
    });

    it('should preserve plain text', () => {
      expect(sanitizeUserInput('Hello World')).toBe('Hello World');
      expect(sanitizeUserInput('123 Test 456')).toBe('123 Test 456');
    });

    it('should handle empty strings', () => {
      expect(sanitizeUserInput('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUserInput('  Hello  ')).toBe('Hello');
    });

    it('should handle special characters', () => {
      expect(sanitizeUserInput('Price: 100€')).toBe('Price: 100€');
      expect(sanitizeUserInput('Email: test@example.com')).toBe('Email: test@example.com');
    });

    it('should handle SQL injection attempts', () => {
      expect(sanitizeUserInput("'; DROP TABLE users; --")).toBe("'; DROP TABLE users; --");
      expect(sanitizeUserInput("1' OR '1'='1")).toBe("1' OR '1'='1");
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeUserInput(longString, 100).length).toBeLessThanOrEqual(100);
    });
  });

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
      const result = sanitizeHTML(html);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove dangerous tags', () => {
      const html = '<script>alert("xss")</script><p>Safe</p>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe</p>');
    });

    it('should remove dangerous attributes', () => {
      const html = '<img src="image.jpg" onerror="alert(1)">';
      const result = sanitizeHTML(html);
      expect(result).not.toContain('onerror');
    });

    it('should allow safe links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = sanitizeHTML(html);
      expect(result).toContain('href');
      expect(result).toContain('example.com');
    });

    it('should remove javascript: links', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHTML(html);
      // eslint-disable-next-line no-script-url -- testing sanitizer against dangerous protocol
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should preserve text content', () => {
      const html = '<div>Hello <strong>World</strong></div>';
      const result = sanitizeHTML(html);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });
  });
});
