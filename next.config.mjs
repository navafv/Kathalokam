/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Allows production builds to successfully complete even if the project has ESLint warnings
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Allows production builds to successfully complete even if the project has TypeScript errors
        ignoreBuildErrors: true,
    },
};

export default nextConfig;