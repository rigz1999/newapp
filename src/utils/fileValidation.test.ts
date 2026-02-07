import { describe, it, expect } from 'vitest';
import { validateFile, validateFiles } from './fileValidation';

describe('fileValidation', () => {
  describe('validateFile - size checks', () => {
    it('should accept files under size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      const result = validateFile(file, { maxSizeMB: 5 });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files over size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const result = validateFile(file, { maxSizeMB: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5');
    });

    it('should accept files exactly at size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = validateFile(file, { maxSizeMB: 5 });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFile - type checks', () => {
    it('should accept valid file types', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFile(pdfFile, {
        allowedTypes: ['application/pdf', 'image/jpeg'],
        allowedExtensions: ['.pdf', '.jpeg'],
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file types', () => {
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(txtFile, {
        allowedTypes: ['application/pdf', 'image/jpeg'],
        allowedExtensions: ['.pdf', '.jpeg'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateFile - combined', () => {
    it('should validate both size and type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      const result = validateFile(file, {
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
        maxSizeMB: 5,
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail if size is invalid', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateFile(file, {
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
        maxSizeMB: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5');
    });

    it('should fail if type is invalid', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

      const result = validateFile(file, {
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
        maxSizeMB: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple valid files', () => {
      const file1 = new File(['a'], 'a.pdf', { type: 'application/pdf' });
      const file2 = new File(['b'], 'b.pdf', { type: 'application/pdf' });
      Object.defineProperty(file1, 'size', { value: 1024 });
      Object.defineProperty(file2, 'size', { value: 1024 });

      const result = validateFiles([file1, file2]);
      expect(result.valid).toBe(true);
    });

    it('should reject if any file is invalid', () => {
      const good = new File(['a'], 'a.pdf', { type: 'application/pdf' });
      const bad = new File(['b'], 'b.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(good, 'size', { value: 1024 });
      Object.defineProperty(bad, 'size', { value: 1024 });

      const result = validateFiles([good, bad]);
      expect(result.valid).toBe(false);
    });

    it('should reject empty file list', () => {
      const result = validateFiles([]);
      expect(result.valid).toBe(false);
    });
  });
});
