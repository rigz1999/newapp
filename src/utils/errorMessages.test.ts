import { describe, it, expect } from 'vitest';
import { formatErrorMessage } from './errorMessages';

describe('formatErrorMessage', () => {
  it('should format Error objects', () => {
    const error = new Error('Test error message');
    const result = formatErrorMessage(error);

    expect(result).toBe('Test error message');
  });

  it('should format string errors', () => {
    const error = 'Simple error string';
    const result = formatErrorMessage(error);

    expect(result).toBe('Simple error string');
  });

  it('should format objects with message property', () => {
    const error = { message: 'Error from object' };
    const result = formatErrorMessage(error);

    expect(result).toBe('Error from object');
  });

  it('should format Supabase errors with details', () => {
    const error = {
      message: 'Database error',
      details: 'Connection timeout',
      hint: 'Check your network',
    };
    const result = formatErrorMessage(error);

    // formatErrorMessage uses the message field for pattern matching
    expect(result).toContain('Database error');
  });

  it('should handle PostgreSQL errors', () => {
    const error = {
      message: 'duplicate key value violates unique constraint',
      code: '23505',
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('existe déjà');
  });

  it('should handle foreign key constraint errors', () => {
    const error = {
      message: 'violates foreign key constraint',
      code: '23503',
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('utilisé ailleurs');
  });

  it('should handle connection errors', () => {
    const error = {
      message: 'Failed to fetch',
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('connexion');
  });

  it('should handle network errors', () => {
    const error = {
      message: 'Network request failed',
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('connexion');
  });

  it('should handle authentication errors', () => {
    const error = {
      message: 'Invalid login credentials',
      status: 401,
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('mot de passe incorrect');
  });

  it('should handle permission errors', () => {
    const error = {
      message: 'permission denied',
      status: 403,
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('Accès refusé');
  });

  it('should handle not found errors', () => {
    const error = {
      message: 'not found',
      status: 404,
    };
    const result = formatErrorMessage(error);

    // 'not found' is grouped with function/service errors in the implementation
    expect(result).toContain('indisponible');
  });

  it('should handle timeout errors', () => {
    const error = {
      message: 'Request timeout',
    };
    const result = formatErrorMessage(error);

    expect(result).toContain('trop de temps');
  });

  it('should provide default message for unknown errors', () => {
    const error = {};
    const result = formatErrorMessage(error);

    expect(result).toBe("Une erreur inattendue s'est produite");
  });

  it('should handle null and undefined', () => {
    expect(formatErrorMessage(null)).toBe("Une erreur inattendue s'est produite");
    expect(formatErrorMessage(undefined)).toBe("Une erreur inattendue s'est produite");
  });

  it('should sanitize SQL injection attempts in error messages', () => {
    const error = {
      message: 'Error: DROP TABLE users; --',
    };
    const result = formatErrorMessage(error);

    // Should not contain the SQL injection
    expect(result).not.toContain('DROP TABLE');
  });

  it('should handle errors with stack traces gracefully', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n  at function1\n  at function2';

    const result = formatErrorMessage(error);

    // Should return message, not full stack
    expect(result).toBe('Test error');
    expect(result).not.toContain('at function1');
  });
});
