/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@nexflow/ui',
    '@nexflow/database',
    '@nexflow/api-client',
    '@nexflow/integrations',
    '@nexflow/ai',
    '@nexflow/config',
  ],
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'cdn.discordapp.com',
      'avatars.slack-edge.com',
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

module.exports = nextConfig
