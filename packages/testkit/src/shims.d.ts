declare module 'fs/promises' {
  const value: any;
  export = value;
}

declare module 'path' {
  const value: any;
  export = value;
}

declare module 'crypto' {
  export function randomUUID(): string;
}

declare module 'zod' {
  export const z: any;
}

declare const __dirname: string;

declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): any;

declare function fetch(input: any, init?: any): Promise<any>;

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
};
