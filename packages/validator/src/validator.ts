import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  expected?: any;
  actual?: any;
  specLink?: string;
}

export interface TraceData {
  projectId: string;
  requestMeta: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    timestamp: string;
  };
  responseMeta: {
    statusCode: number;
    headers: Record<string, string>;
    body?: any;
    timestamp: string;
    latencyMs: number;
  };
  verdict: 'pass' | 'fail' | 'warning';
  validation: ValidationResult;
}

export class SchemaValidator {
  validateRequest(
    request: any,
    schema: any,
    operationId?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Validate against schema
      if (schema.type === 'object' && schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          const value = request[field];
          const fieldValidation = this.validateField(
            field,
            value,
            fieldSchema as any,
            schema.required?.includes(field)
          );
          errors.push(...fieldValidation.errors);
          warnings.push(...fieldValidation.warnings);
        }
      }

      // Check for extra fields not in schema
      if (schema.additionalProperties === false) {
        const schemaFields = Object.keys(schema.properties || {});
        const requestFields = Object.keys(request || {});
        const extraFields = requestFields.filter(
          (f) => !schemaFields.includes(f)
        );
        if (extraFields.length > 0) {
          warnings.push(
            `Extra fields not in schema: ${extraFields.join(', ')}`
          );
        }
      }
    } catch (error) {
      errors.push({
        field: 'root',
        message: `Schema validation error: ${error}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateResponse(
    response: any,
    schema: any,
    statusCode: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      if (schema.type === 'object' && schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          const value = response[field];
          const fieldValidation = this.validateField(
            field,
            value,
            fieldSchema as any,
            schema.required?.includes(field)
          );
          errors.push(...fieldValidation.errors);
          warnings.push(...fieldValidation.warnings);
        }
      }
    } catch (error) {
      errors.push({
        field: 'root',
        message: `Response validation error: ${error}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateField(
    fieldName: string,
    value: any,
    schema: any,
    required: boolean = false
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check required
    if (required && (value === undefined || value === null)) {
      errors.push({
        field: fieldName,
        message: 'Required field is missing',
        expected: schema.type,
        actual: typeof value,
      });
      return { valid: false, errors, warnings };
    }

    if (value === undefined || value === null) {
      return { valid: true, errors, warnings };
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type && actualType !== schema.type) {
      errors.push({
        field: fieldName,
        message: `Type mismatch`,
        expected: schema.type,
        actual: actualType,
      });
    }

    // Format validation
    if (schema.format) {
      const formatValid = this.validateFormat(value, schema.format);
      if (!formatValid) {
        errors.push({
          field: fieldName,
          message: `Invalid format`,
          expected: schema.format,
          actual: value,
        });
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `Value not in allowed enum`,
        expected: schema.enum,
        actual: value,
      });
    }

    // Range validation
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: fieldName,
        message: `Value below minimum`,
        expected: `>= ${schema.minimum}`,
        actual: value,
      });
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: fieldName,
        message: `Value above maximum`,
        expected: `<= ${schema.maximum}`,
        actual: value,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateFormat(value: any, format: string): boolean {
    switch (format) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value
        );
      case 'date-time':
        return !isNaN(Date.parse(value));
      case 'uri':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  generateHumanReadableError(error: ValidationError): string {
    let message = `**${error.field}**: ${error.message}`;
    
    if (error.expected !== undefined) {
      message += `\n  Expected: ${JSON.stringify(error.expected)}`;
    }
    
    if (error.actual !== undefined) {
      message += `\n  Actual: ${JSON.stringify(error.actual)}`;
    }

    if (error.specLink) {
      message += `\n  See spec: ${error.specLink}`;
    }

    return message;
  }
}

export function createValidator(): SchemaValidator {
  return new SchemaValidator();
}
