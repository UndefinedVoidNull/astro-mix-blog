/**
 * Shared by `prebuild.js` (Node) and Astro. Single source of truth — no generated JSON copy.
 * Do not use process.env for the public site URL; set `siteUrl` here (and match `astro.config.mjs` `site`).
 */
export const SITE_CONFIG = {
	siteUrl: 'https://233lol.com',
	siteName: "Askin博客 | 月刊 文章 分享",
	defaultDescription: 'Askin博客 | 月刊 文章 分享',
	rssDescription: 'Askin博客 | 月刊 文章 分享',
	entriesPerPage: 10,
	keywords: ['blog', 'monthly', 'newsletter', 'articles', 'share'],
	/** @type {string} e.g. @yourhandle — omit or leave empty to skip twitter:site */
	twitterSite: '',
};

export default SITE_CONFIG;
