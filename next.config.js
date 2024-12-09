/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['*'], // Allow images from all domains. In production, you should list specific domains
  },
}

module.exports = nextConfig
