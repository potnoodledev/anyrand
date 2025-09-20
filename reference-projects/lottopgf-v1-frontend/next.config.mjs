import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

export default function nextConfig(phase) {
  const isBuild = phase === PHASE_PRODUCTION_BUILD;

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    webpack: isBuild
      ? (config) => {
          config.externals.push("pino-pretty", "lokijs", "encoding");
          return config;
        }
      : undefined,
  };

  return nextConfig;
}
