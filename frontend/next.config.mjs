/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Traces the modules actually imported into .next/standalone, so the Docker
  // runtime layer ships ~50 MB instead of the whole node_modules tree.
  output: "standalone",
  // The backend URL is read at runtime in the browser, so it is exposed here
  // with a localhost default that works for `npm run dev` with no .env file.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
