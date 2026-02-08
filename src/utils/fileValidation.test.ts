import { describe, it, expect, vi } from 'vitest';

// Mock the config module before importing fileValidation
vi.mock('../config', () => ({
  fileUpload: {
    maxSizeDocuments: 10,
    maxSizeImages: 5,
    maxSizeRib: 5,
  },
}));

import { validateFileSize, validateFileType, validateFile } from './fileValidation';

describe('fileValidation', () => {
  describe('validateFileSize', () => {
    it('should accept files under size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      const result = validateFileSize(file, 5);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files over size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const result = validateFileSize(file, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 Mo');
    });

    it('should accept files exactly at size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = validateFileSize(file, 5);
      expect(result.valid).toBe(true);
    });

    it('should use default 5MB limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const result = validateFileSize(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('should accept valid file types', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileType(pdfFile, ['application/pdf', 'image/jpeg']);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file types', () => {
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFileType(txtFile, ['application/pdf', 'image/jpeg']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Type de fichier non supporté');
    });

    it('should handle empty allowed types array', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileType(file, []);
      expect(result.valid).toBe(false);
    });

    it('should be case-insensitive for MIME types', () => {
      const file = new File(['content'], 'test.pdf', { type: 'Application/PDF' });
      const result = validateFileType(file, ['application/pdf']);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('should validate both size and type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      const result = validateFile(file, { allowedTypes: ['application/pdf'], maxSizeMB: 5 });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail if size is invalid', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateFile(file, { allowedTypes: ['application/pdf'], maxSizeMB: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('trop volumineux');
    });

    it('should fail if type is invalid', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

      const result = validateFile(file, { allowedTypes: ['application/pdf'], maxSizeMB: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non autorisé');
    });

    it('should return first error encountered', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateFile(file, { allowedTypes: ['application/pdf'], maxSizeMB: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
