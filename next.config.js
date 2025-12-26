/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output: 'standalone' for AWS, 'default' for Vercel
  // Both work, but 'standalone' gives more control for AWS deployments
  output: 'standalone',
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images if using next/image
  images: {
    domains: [],
  },
}

module.exports = nextConfig

