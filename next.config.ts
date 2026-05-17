import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(withPayload(nextConfig));
