// ============================================
// File Upload Validation Utility
// Path: src/utils/fileValidation.ts
// ============================================

import { fileUpload } from '../config';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_MAX_SIZE_MB = fileUpload.maxSizeDocuments;
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];
const DEFAULT_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

/**
 * Validates a file for upload
 * Checks file type, size, and extension
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
  } = options;

  // Check if file exists
  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné' };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux. Taille maximale : ${maxSizeMB}MB`,
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé. Types acceptés : ${allowedExtensions.join(', ')}`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Extension de fichier non autorisée. Extensions acceptées : ${allowedExtensions.join(', ')}`,
    };
  }

  // Additional security check: verify the file is not executable
  const dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.sh',
    '.app',
    '.deb',
    '.rpm',
    '.dmg',
    '.js',
    '.mjs',
    '.cjs',
    '.vbs',
    '.jar',
  ];

  const hasDangerousExtension = dangerousExtensions.some(ext =>
    fileName.endsWith(ext.toLowerCase())
  );

  if (hasDangerousExtension) {
    return {
      valid: false,
      error: 'Ce type de fichier est interdit pour des raisons de sécurité',
    };
  }

  return { valid: true };
}

/**
 * Validates multiple files
 */
export function validateFiles(
  files: File[] | FileList,
  options: FileValidationOptions = {}
): FileValidationResult {
  const fileArray = Array.from(files);

  if (fileArray.length === 0) {
    return { valid: false, error: 'Aucun fichier sélectionné' };
  }

  for (const file of fileArray) {
    const result = validateFile(file, options);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Validates file size only
 */
export function validateFileSize(file: File, maxSizeMB: number = 5): FileValidationResult {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `Le fichier dépasse la taille maximale de ${maxSizeMB} Mo` };
  }
  return { valid: true };
}

/**
 * Validates file type only
 */
export function validateFileType(file: File, allowedTypes: string[]): FileValidationResult {
  if (allowedTypes.length === 0) {
    return { valid: false, error: 'Type de fichier non supporté' };
  }
  const fileType = file.type.toLowerCase();
  const isAllowed = allowedTypes.some(t => t.toLowerCase() === fileType);
  if (!isAllowed) {
    return { valid: false, error: 'Type de fichier non supporté' };
  }
  return { valid: true };
}

/**
 * Preset configurations for common file types
 * Uses config values from environment variables
 */
export const FILE_VALIDATION_PRESETS = {
  // Images only
  images: {
    maxSizeMB: fileUpload.maxSizeImages,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },

  // Documents (PDF, images)
  documents: {
    maxSizeMB: fileUpload.maxSizeDocuments,
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
  },

  // PDF only
  pdf: {
    maxSizeMB: fileUpload.maxSizeDocuments,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
  },

  // RIB/Bank documents (images and PDF)
  rib: {
    maxSizeMB: fileUpload.maxSizeRib,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
  },
};
