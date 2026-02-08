import { describe, it, expect } from 'vitest';
import { sanitizeUserInput as sanitizeInput, sanitizeHTML as sanitizeHtml } from './sanitizer';

describe('sanitizer', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeInput('<b>Bold</b> text')).toBe('Bold text');
      expect(sanitizeInput('<div>Content</div>')).toBe('Content');
    });

    it('should remove dangerous scripts', () => {
      expect(sanitizeInput('Hello<script>alert(1)</script>World')).toBe('HelloWorld');
      expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('');
    });

    it('should handle nested tags', () => {
      expect(sanitizeInput('<div><span>Text</span></div>')).toBe('Text');
      expect(sanitizeInput('<a href="#"><b>Link</b></a>')).toBe('Link');
    });

    it('should preserve plain text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('123 Test 456')).toBe('123 Test 456');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  Hello  ')).toBe('Hello');
      expect(sanitizeInput('\n\nText\n\n')).toBe('Text');
    });

    it('should handle special characters', () => {
      expect(sanitizeInput('Price: 100€')).toBe('Price: 100€');
      expect(sanitizeInput('Email: test@example.com')).toBe('Email: test@example.com');
    });

    it('should handle SQL injection attempts', () => {
      expect(sanitizeInput("'; DROP TABLE users; --")).toBe("'; DROP TABLE users; --");
      expect(sanitizeInput("1' OR '1'='1")).toBe("1' OR '1'='1");
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove dangerous tags', () => {
      const html = '<script>alert("xss")</script><p>Safe</p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe</p>');
    });

    it('should remove dangerous attributes', () => {
      const html = '<img src="image.jpg" onerror="alert(1)">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onerror');
    });

    it('should allow safe links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href');
      expect(result).toContain('example.com');
    });

    it('should remove javascript: links', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(html);
      // eslint-disable-next-line no-script-url
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should preserve text content', () => {
      const html = '<div>Hello <strong>World</strong></div>';
      const result = sanitizeHtml(html);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });
  });
});
