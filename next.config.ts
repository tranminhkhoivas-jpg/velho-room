import type { NextConfig } from "next";
import { existsSync } from "node:fs";

// ponytail: keys live in the project-root .env, shared with the Bahn entry
if (existsSync("../../.env")) process.loadEnvFile("../../.env");

const config: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
};
export default config;
