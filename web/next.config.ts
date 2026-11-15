import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Windows local builds use next start; Linux container builds emit standalone.
  output: process.platform === "win32" ? undefined : "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }]
  },
}

export default nextConfig
