import { randomUUID } from 'crypto';

type Primitive = string | number | boolean | null;

type TemplateRecord = { [key: string]: TemplateValue };
type TemplateArray = TemplateValue[];
type TemplateValue = Primitive | TemplateRecord | TemplateArray;

function resolveString(value: string): string {
  if (value.includes('{{uuid}}')) {
    return value.replace(/\{\{uuid\}\}/g, randomUUID());
  }
  return value;
}

export function resolveTemplates<T extends TemplateValue>(value: T): T {
  if (typeof value === 'string') {
    return resolveString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplates(item)) as T;
  }

  if (value && typeof value === 'object') {
    const result: TemplateRecord = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveTemplates(val as TemplateValue);
    }
    return result as T;
  }

  return value;
}
