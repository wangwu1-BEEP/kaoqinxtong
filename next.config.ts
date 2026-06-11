import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // standalone 模式仅用于 Electron 打包，云端部署需要默认模式
  // 如需 Electron 打包，取消下面两行注释：
  // output: 'standalone',
  // outputFileTracingRoot: path.resolve(__dirname),
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
