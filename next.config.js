const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  webpack: (config) => {
    // @novu/react -> solid-motionone -> @solid-primitives/* have "exports" without "."
    // so resolution fails. Alias to dist/index.js via filesystem path.
    const root = path.join(__dirname, 'node_modules');
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@solid-primitives/props'] = path.join(root, '@solid-primitives/props/dist/index.js');
    config.resolve.alias['@solid-primitives/refs'] = path.join(root, '@solid-primitives/refs/dist/index.js');
    config.resolve.alias['@solid-primitives/transition-group'] = path.join(root, '@solid-primitives/transition-group/dist/index.js');
    return config;
  },
};

module.exports = nextConfig;
