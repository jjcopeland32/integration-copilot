declare module 'js-yaml' {
  const yaml: {
    load(input: string, options?: Record<string, unknown>): any;
  };
  export default yaml;
}
