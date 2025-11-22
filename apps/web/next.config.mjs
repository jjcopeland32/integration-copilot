import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.COPILOT_WORKSPACE_ROOT) {
  process.env.COPILOT_WORKSPACE_ROOT = path.join(moduleDir, '..', '..');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};
export default nextConfig;
