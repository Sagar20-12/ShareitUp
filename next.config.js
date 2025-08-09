/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
  // Optional: Disable ESLint during builds if you want to handle linting separately
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
}

module.exports = nextConfig