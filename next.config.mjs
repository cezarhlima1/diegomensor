/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Evita o crash do WasmHash do webpack no build da Vercel:
    // "TypeError: Cannot read properties of undefined (reading 'length')
    //  at WasmHash._updateWithBuffer".
    // Usa o hash nativo do Node (crypto) no lugar da implementação WebAssembly.
    config.output.hashFunction = "sha256";
    return config;
  },
};

export default nextConfig;
