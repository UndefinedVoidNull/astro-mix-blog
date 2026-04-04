// @ts-check
import { defineConfig } from 'astro/config';

// Keep in sync with `SITE_CONFIG.siteUrl` in site.config.mjs (no process.env).
export default defineConfig({
	site: 'https://233lol.com',
	trailingSlash: 'ignore',
});
