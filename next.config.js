/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: {
        // Warnings in dashboard pages should not block production Docker builds
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

module.exports = nextConfig;
