import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Validation rules type
type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'url';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message?: string;
};

// Request validation middleware
export const validateRequest = (rules: ValidationRule[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const data = { ...req.body, ...req.query, ...req.params };

    for (const rule of rules) {
      const value = data[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(rule.message || `${rule.field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(rule.message || `${rule.field} must be a string`);
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(rule.message || `${rule.field} must be a number`);
            }
            break;
          case 'email':
            if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(rule.message || `${rule.field} must be a valid email`);
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              errors.push(rule.message || `${rule.field} must be a valid URL`);
            }
            break;
        }
      }

      // String length validation
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(rule.message || `${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(rule.message || `${rule.field} must be at most ${rule.maxLength} characters`);
        }
      }

      // Number range validation
      if (rule.type === 'number' && !isNaN(Number(value))) {
        const numValue = Number(value);
        if (rule.min !== undefined && numValue < rule.min) {
          errors.push(rule.message || `${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && numValue > rule.max) {
          errors.push(rule.message || `${rule.field} must be at most ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(rule.message || `${rule.field} format is invalid`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
    }

    next();
  };
};

// Common validation rules
export const commonValidations = {
  searchQuery: [
    { field: 'query', required: true, type: 'string' as const, minLength: 1, maxLength: 500 },
    { field: 'limit', type: 'number' as const, min: 1, max: 100 },
    { field: 'offset', type: 'number' as const, min: 0 }
  ],
  
  pagination: [
    { field: 'limit', type: 'number' as const, min: 1, max: 100 },
    { field: 'offset', type: 'number' as const, min: 0 }
  ],

  fileUpload: [
    { field: 'file', required: true, message: 'File is required' }
  ]
};
