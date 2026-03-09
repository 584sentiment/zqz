const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@ai-job-assistant/shared',
    '@ai-job-assistant/database',
    // tldraw 相关包 - 解决重复加载问题
    'tldraw',
    '@tldraw/editor',
    '@tldraw/store',
    '@tldraw/tlschema',
    '@tldraw/utils',
    '@tldraw/state',
    '@tldraw/state-react',
    '@tldraw/validate',
  ],
  experimental: {
    typedRoutes: false,
  },
  // Webpack 配置
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 客户端编译时增加内存限制
      config.infrastructureLogging = {
        level: 'error',
      };
    }

    // 解决 tldraw 重复加载问题 - 强制使用同一个实例
    config.resolve.alias = {
      ...config.resolve.alias,
      // 确保所有 @tldraw/* 包使用同一个实例（在 monorepo 根目录）
      '@tldraw/editor': path.resolve(__dirname, '../../node_modules/@tldraw/editor'),
      '@tldraw/store': path.resolve(__dirname, '../../node_modules/@tldraw/store'),
      '@tldraw/tlschema': path.resolve(__dirname, '../../node_modules/@tldraw/tlschema'),
      '@tldraw/utils': path.resolve(__dirname, '../../node_modules/@tldraw/utils'),
      '@tldraw/state': path.resolve(__dirname, '../../node_modules/@tldraw/state'),
      '@tldraw/state-react': path.resolve(__dirname, '../../node_modules/@tldraw/state-react'),
      '@tldraw/validate': path.resolve(__dirname, '../../node_modules/@tldraw/validate'),
    };

    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  // 安全头配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 防止点击劫持
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // 防止 MIME 类型嗅探
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS 保护
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 引用策略
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 权限策略
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
