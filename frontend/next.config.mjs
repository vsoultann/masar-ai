/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The backend URL is read at runtime in the browser, so it is exposed here
  // with a localhost default that works for `npm run dev` with no .env file.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
