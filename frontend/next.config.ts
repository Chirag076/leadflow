import type { NextConfig } from "next";

// Where the FastAPI server lives. Read when the app is built (and by `next dev`), so set it before
// `npm run build`; docker-compose passes it as a build argument.
const apiUrl = (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // The browser only ever talks to this app; /api/* is proxied to FastAPI, so there is no CORS.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
