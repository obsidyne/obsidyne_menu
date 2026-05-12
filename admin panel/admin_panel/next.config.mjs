/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
   async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/*',
      },
    ];
  },
};

export default nextConfig;
