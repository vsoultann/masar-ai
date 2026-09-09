/** @type {import('next').NextConfig} */

/**
 * GitHub Pages serves this app from https://<user>.github.io/masar-ai/, so every
 * asset URL needs the /masar-ai prefix in production. Development deliberately
 * runs without it: forcing the prefix locally makes http://localhost:3000 a 404,
 * which is a bad first experience for anyone cloning the repo.
 *
 * The safety net for the classic "works in dev, broken assets in production"
 * failure is not the dev server -- it is `npm run predeploy:check`, which fails
 * the build on any hardcoded absolute asset path, plus CI running the real
 * production build. Use the asset() helper in lib/paths.ts for anything under
 * /public rather than writing a leading-slash URL by hand.
 */
const basePath = process.env.NODE_ENV === "production" ? "/masar-ai" : "";

const nextConfig = {
  reactStrictMode: true,

  // A fully static site: `next build` writes out/ with no Node process needed.
  output: "export",

  basePath,
  assetPrefix: basePath || undefined,

  // next/image's optimizer is a server feature; static export needs raw <img>.
  images: { unoptimized: true },

  // Emits out/careers/index.html instead of out/careers.html, so GitHub Pages
  // resolves /careers/ and /careers identically without a rewrite rule.
  trailingSlash: true,

  // Exposed so client code can build correct links without importing the config.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
