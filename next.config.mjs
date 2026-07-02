/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
