const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
];

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^[0-9a-f:]+$/i;

export function isRelativePath(path: string): boolean {
  if (typeof path !== 'string') {
    return false;
  }
  if (!path.startsWith('/')) {
    return false;
  }
  if (path.includes('://') || path.startsWith('//')) {
    return false;
  }
  if (path.includes('..')) {
    return false;
  }
  return true;
}

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isIpAddress(hostname: string): boolean {
  if (!hostname) return false;
  if (IPV4_PATTERN.test(hostname)) {
    return true;
  }
  if (hostname.includes(':') && IPV6_PATTERN.test(hostname)) {
    return true;
  }
  return false;
}

export function buildSafeUrl(
  relativePath: string,
  origin: string,
  allowInsecure = false
): string {
  if (!isRelativePath(relativePath)) {
    throw new Error('Requests must use relative paths');
  }

  const parsedOrigin = new URL(origin);
  const protocol = parsedOrigin.protocol;

  if (protocol !== 'https:' && !(allowInsecure && protocol === 'http:')) {
    throw new Error('HTTPS origin required');
  }

  if (!allowInsecure && (isPrivateHost(parsedOrigin.hostname) || isIpAddress(parsedOrigin.hostname))) {
    throw new Error('Origin cannot target localhost, private networks, or raw IPs');
  }

  return new URL(relativePath, parsedOrigin).toString();
}
