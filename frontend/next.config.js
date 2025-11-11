/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for S3/CloudFront
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true,
  reactStrictMode: true,
}

module.exports = nextConfig

