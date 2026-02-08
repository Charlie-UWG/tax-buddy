/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: "out",
  // assetPrefixを空文字ではなく「.」にすることで、
  // HTMLから見た相対パス（./_next/...）を強制します
  assetPrefix: "./",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
