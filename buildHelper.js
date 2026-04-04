import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { load } from 'cheerio';
import SITE_CONFIG from './site.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const POST_ROOT = path.join(ROOT, 'src', 'post');
const BRACKET_TITLE_RE = /^\[(\d{4}-\d{2}-\d{2})\](.*)$/;

function siteUrlBase() {
	return SITE_CONFIG.siteUrl.replace(/\/$/, '');
}

/** @type {Array<{ title: string, date: string, url: string, pinned?: boolean }>} */
const entries = [];

function formatLocalDate(ms) {
	const d = new Date(ms);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function parseName(fullPath) {
	const ext = path.extname(fullPath);
	const base = path.basename(fullPath, ext);
	const stat = fs.statSync(fullPath);
	const m = base.match(BRACKET_TITLE_RE);
	if (m) {
		const title = (m[2] || '').trim() || base;
		return { date: m[1], title };
	}
	return { date: formatLocalDate(stat.mtimeMs), title: base };
}

function listFilesRecursive(dir) {
	const out = [];
	if (!fs.existsSync(dir)) return out;

	function walk(d) {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			if (e.name === 'archives') continue;
			if (e.name === 'node_modules' || e.name === '.git') continue;
			if (e.name === 'public' && path.basename(d) === 'qmd') continue;
			const full = path.join(d, e.name);
			if (e.isDirectory()) {
				walk(full);
			} else {
				const relFromPost = path.relative(POST_ROOT, full);
				const parts = relFromPost.split(path.sep);
				if (parts.some((s) => s === 'archives')) continue;
				out.push(full);
			}
		}
	}
	walk(dir);
	return out;
}

function htmlOutputFileName(filename) {
	const ext = path.extname(filename);
	const stem = path.basename(filename, ext);
	const m = stem.match(BRACKET_TITLE_RE);
	const rest = m ? (m[2] || '').trim() : stem;
	const safe = (rest || 'post').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
	return `${safe}${ext}`;
}

/** Downloaded/copied post images live here; build copies into public/post/img. */
const HTML_IMG_STORAGE = path.join(POST_ROOT, 'html', 'img');
const PUBLIC_POST_IMG = path.join(ROOT, 'public', 'post', 'img');
const HTML_SRC_ROOTS = [
	path.resolve(POST_ROOT, 'html'),
	path.resolve(POST_ROOT, 'pin', 'html'),
];

function extFromMime(mime) {
	if (!mime) return '';
	const base = mime.split(';')[0].trim().toLowerCase();
	const map = {
		'image/jpeg': '.jpg',
		'image/jpg': '.jpg',
		'image/png': '.png',
		'image/gif': '.gif',
		'image/webp': '.webp',
		'image/svg+xml': '.svg',
		'image/avif': '.avif',
		'image/bmp': '.bmp',
		'image/x-icon': '.ico',
	};
	return map[base] || '';
}

function extFromUrl(urlStr) {
	try {
		const u = new URL(urlStr);
		const ext = path.extname(u.pathname).toLowerCase();
		if (ext && ext.length <= 6 && /^\.[a-z0-9]+$/i.test(ext)) return ext;
	} catch {
		/* ignore */
	}
	return '';
}

function isSafeLocalImagePath(resolvedAbs) {
	const norm = path.normalize(resolvedAbs);
	return HTML_SRC_ROOTS.some(
		(root) => norm === root || norm.startsWith(root + path.sep),
	);
}

/**
 * Download remote <img src> into src/post/html/img, copy to public/post/img,
 * rewrite src to /post/img/.... Local paths under src/post/html are copied the same way.
 */
async function localizeHtmlImages(html, sourceHtmlPath) {
	const $ = load(html, { decodeEntities: false });
	const imgs = $('img[src]');
	if (imgs.length === 0) return html;

	fs.mkdirSync(HTML_IMG_STORAGE, { recursive: true });
	fs.mkdirSync(PUBLIC_POST_IMG, { recursive: true });

	const sourceDir = path.dirname(sourceHtmlPath);

	for (const el of imgs.toArray()) {
		const $img = $(el);
		let src = ($img.attr('src') || '').trim();
		if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;
		if (src.startsWith('//')) {
			src = `https:${src}`;
		}

		if (src.startsWith('/post/img/')) {
			const baseName = path.basename(src.split('?')[0]);
			const fromStore = path.join(HTML_IMG_STORAGE, baseName);
			if (fs.existsSync(fromStore)) {
				fs.copyFileSync(fromStore, path.join(PUBLIC_POST_IMG, baseName));
			}
			continue;
		}

		let buf;
		let suggestedExt = '';

		if (/^https?:\/\//i.test(src)) {
			try {
				const res = await fetch(src, {
					headers: { 'User-Agent': 'buildHelper/1.0 (image prefetch)' },
					redirect: 'follow',
				});
				if (!res.ok) {
					console.warn(`buildHelper: skip img HTTP ${res.status} ${src}`);
					continue;
				}
				buf = Buffer.from(await res.arrayBuffer());
				suggestedExt =
					extFromMime(res.headers.get('content-type')) || extFromUrl(src);
			} catch (err) {
				console.warn(`buildHelper: img fetch failed ${src}`, err?.message || err);
				continue;
			}
		} else {
			const decoded = decodeURIComponent(src.split('?')[0].replace(/^\.\//, ''));
			const resolvedAbs = path.resolve(sourceDir, decoded);
			if (!isSafeLocalImagePath(resolvedAbs)) {
				console.warn(`buildHelper: skip img outside src/post/html: ${src}`);
				continue;
			}
			if (!fs.existsSync(resolvedAbs) || !fs.statSync(resolvedAbs).isFile()) {
				console.warn(`buildHelper: skip missing local img ${src}`);
				continue;
			}
			buf = fs.readFileSync(resolvedAbs);
			suggestedExt = path.extname(resolvedAbs).toLowerCase() || '.bin';
		}

		const hash = crypto.createHash('sha256').update(src).digest('hex').slice(0, 20);
		const ext =
			suggestedExt && /^\.[a-z0-9]{1,8}$/i.test(suggestedExt) ? suggestedExt : '.img';
		const fileName = `${hash}${ext}`;
		const storagePath = path.join(HTML_IMG_STORAGE, fileName);

		if (!fs.existsSync(storagePath)) {
			fs.writeFileSync(storagePath, buf);
		}
		fs.copyFileSync(storagePath, path.join(PUBLIC_POST_IMG, fileName));
		$img.attr('src', `/post/img/${fileName}`);
	}

	return $.html();
}

/**
 * Embed inject.css into the document so posts work without a separate /post/inject.css request.
 */
function injectBlogStyles(html, cssText) {
	if (!cssText || !cssText.trim()) return html;
	const block = `\n<style data-blog-inject="1">\n${cssText}\n</style>\n`;
	if (/<\/head>/i.test(html)) {
		return html.replace(/<\/head>/i, `${block}</head>`);
	}
	if (/<head[^>]*>/i.test(html)) {
		return html.replace(/<head[^>]*>/i, (open) => `${open}${block}`);
	}
	return `<head><meta charset="utf-8" />${block}</head>\n${html}`;
}

function toUrlPosix(...segments) {
	return '/' + path.posix.join(...segments.filter(Boolean));
}

/** Pinned layout: src/post/{file,html,qmd}/pin/... → /public/post/pin/... and entries.pinned */
function isPinSubfolderRel(rel) {
	return rel.split(path.sep)[0] === 'pin';
}

function entryPinnedForSourceTree(pinnedFlag, srcDirAbs, mainTreeRootAbs, relFromSrcDir) {
	if (pinnedFlag) return true;
	if (path.resolve(srcDirAbs) !== path.resolve(mainTreeRootAbs)) return false;
	return isPinSubfolderRel(relFromSrcDir);
}

function ensureInjectCss() {
	const src = path.join(POST_ROOT, 'html', 'inject.css');
	const dest = path.join(ROOT, 'public', 'post', 'inject.css');
	if (fs.existsSync(src)) {
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(src, dest);
	}
}

function copyFileTree(srcDir, destDir, urlPrefixSegments, pinned) {
	const mainRoot = path.join(POST_ROOT, 'file');
	const files = listFilesRecursive(srcDir);
	for (const full of files) {
		const rel = path.relative(srcDir, full);
		const dest = path.join(destDir, rel);
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(full, dest);
		const { date, title } = parseName(full);
		const url = toUrlPosix(...urlPrefixSegments, ...rel.split(path.sep));
		const entryPinned = entryPinnedForSourceTree(pinned, srcDir, mainRoot, rel);
		entries.push({ title, date, url, ...(entryPinned ? { pinned: true } : {}) });
	}
}

async function processHtmlDir(srcDir, destDir, urlPrefixSegments, pinned, injectCssText) {
	const mainRoot = path.join(POST_ROOT, 'html');
	const files = listFilesRecursive(srcDir);
	for (const full of files) {
		if (!full.toLowerCase().endsWith('.html')) continue;

		const rel = path.relative(srcDir, full);
		const relDir = path.dirname(rel);
		const outName = htmlOutputFileName(path.basename(full));
		const dest =
			relDir === '.'
				? path.join(destDir, outName)
				: path.join(destDir, relDir, outName);

		let html = fs.readFileSync(full, 'utf8');
		html = await localizeHtmlImages(html, full);
		html = injectBlogStyles(html, injectCssText);
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.writeFileSync(dest, html, 'utf8');

		const { date, title } = parseName(full);
		const url =
			relDir === '.'
				? toUrlPosix(...urlPrefixSegments, outName)
				: toUrlPosix(...urlPrefixSegments, ...relDir.split(path.sep), outName);
		const entryPinned = entryPinnedForSourceTree(pinned, srcDir, mainRoot, rel);
		entries.push({ title, date, url, ...(entryPinned ? { pinned: true } : {}) });
	}
}

/**
 * Quarto treats --output-dir as relative to the .qmd directory, so a path like
 * "public/post" ends up under src/post/qmd/public/post. Use an absolute path so
 * output always lands in the repo's public/post (or pin) folder.
 */
function renderQuarto(qmdPath, outputDirAbs) {
	const relQmd = path.relative(ROOT, path.resolve(qmdPath)).split(path.sep).join('/');
	const absOutDir = path.resolve(outputDirAbs);
	fs.mkdirSync(absOutDir, { recursive: true });
	const outDirArg = absOutDir.split(path.sep).join('/');
	execSync(
		`quarto render "${relQmd}" --to html --embed-resources --output-dir "${outDirArg}"`,
		{
			cwd: ROOT,
			stdio: 'inherit',
			shell: true,
		},
	);
}

function removeStrayQuartoOutputUnderQmd(srcDir) {
	const stray = path.join(srcDir, 'public');
	if (fs.existsSync(stray)) {
		fs.rmSync(stray, { recursive: true, force: true });
	}
}

function processQmdDir(srcDir, outputDirAbs, urlPrefixSegments, pinned) {
	if (!fs.existsSync(srcDir)) return;
	removeStrayQuartoOutputUnderQmd(srcDir);
	const mainRoot = path.join(POST_ROOT, 'qmd');
	let files = listFilesRecursive(srcDir).filter((f) =>
		f.toLowerCase().endsWith('.qmd'),
	);
	if (!pinned && path.resolve(srcDir) === path.resolve(mainRoot)) {
		files = files.filter((f) => !isPinSubfolderRel(path.relative(srcDir, f)));
	}
	const outRoot = path.resolve(outputDirAbs);
	fs.mkdirSync(outRoot, { recursive: true });
	for (const full of files) {
		renderQuarto(full, outRoot);
		const { date, title } = parseName(full);
		const stem = path.basename(full, '.qmd');
		const outHtml = `${stem}.html`;
		const rel = path.relative(srcDir, path.dirname(full));
		const url =
			rel === '.' || rel === ''
				? toUrlPosix(...urlPrefixSegments, outHtml)
				: toUrlPosix(...urlPrefixSegments, ...rel.split(path.sep), outHtml);
		const relFile = path.relative(srcDir, full);
		const entryPinned = entryPinnedForSourceTree(pinned, srcDir, mainRoot, relFile);
		entries.push({ title, date, url, ...(entryPinned ? { pinned: true } : {}) });
	}
}

async function main() {
	ensureInjectCss();

	const injectPath = path.join(POST_ROOT, 'html', 'inject.css');
	const injectCssText = fs.existsSync(injectPath)
		? fs.readFileSync(injectPath, 'utf8')
		: '';

	const fileDir = path.join(POST_ROOT, 'file');
	const htmlDir = path.join(POST_ROOT, 'html');
	const qmdDir = path.join(POST_ROOT, 'qmd');
	const pinRoot = path.join(POST_ROOT, 'pin');
	const publicPost = path.join(ROOT, 'public', 'post');
	const publicPostPin = path.join(publicPost, 'pin');

	copyFileTree(fileDir, publicPost, ['post'], false);

	const pinFile = path.join(pinRoot, 'file');
	copyFileTree(pinFile, publicPostPin, ['post', 'pin'], true);

	await processHtmlDir(htmlDir, publicPost, ['post'], false, injectCssText);

	const pinHtml = path.join(pinRoot, 'html');
	await processHtmlDir(pinHtml, publicPostPin, ['post', 'pin'], true, injectCssText);

	processQmdDir(qmdDir, publicPost, ['post'], false);

	const qmdPinDir = path.join(qmdDir, 'pin');
	processQmdDir(qmdPinDir, publicPostPin, ['post', 'pin'], true);

	const pinQmd = path.join(pinRoot, 'qmd');
	processQmdDir(pinQmd, publicPostPin, ['post', 'pin'], true);

	const sorted = [...entries].sort((a, b) => {
		if (a.date !== b.date) return a.date < b.date ? 1 : -1;
		return a.title.localeCompare(b.title);
	});

	const lines = sorted.map((e) => {
		const pin = e.pinned ? ', pinned: true' : '';
		return `  { title: ${JSON.stringify(e.title)}, date: ${JSON.stringify(e.date)}, url: ${JSON.stringify(e.url)}${pin} },`;
	});
	const content = `/** Generated by buildHelper.js — do not edit by hand */\nexport const entries = [\n${lines.join('\n')}\n];\n`;
	fs.writeFileSync(path.join(ROOT, 'entries.js'), content, 'utf8');

	writeRssFeed(sorted);
	writeRobotsTxt();
	writeSitemapXml(sorted);

	console.log(
		`buildHelper: wrote ${sorted.length} entries, feed.xml, robots.txt, sitemap.xml`,
	);
}

function escapeXml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function absolutePostUrl(urlPath) {
	const p = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
	return siteUrlBase() + encodeURI(p);
}

function writeRssFeed(sortedEntries) {
	const channelTitle = SITE_CONFIG.siteName;
	const channelDesc = SITE_CONFIG.rssDescription;
	const base = siteUrlBase();
	const channelLink = `${base}/`;
	const items = sortedEntries
		.map((e) => {
			const link = absolutePostUrl(e.url);
			const pubDate = new Date(e.date + 'T12:00:00Z').toUTCString();
			return `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
	const out = path.join(ROOT, 'public', 'feed.xml');
	fs.mkdirSync(path.dirname(out), { recursive: true });
	fs.writeFileSync(out, xml, 'utf8');
}

function writeRobotsTxt() {
	const base = siteUrlBase();
	const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
	fs.writeFileSync(path.join(ROOT, 'public', 'robots.txt'), body, 'utf8');
}

function writeSitemapXml(sortedEntries) {
	const base = siteUrlBase();
	const today = new Date().toISOString().slice(0, 10);
	const urls = [];

	const add = (loc, opts = {}) => {
		urls.push({ loc, lastmod: opts.lastmod || today, changefreq: opts.changefreq || 'weekly', priority: opts.priority || '0.8' });
	};

	add(`${base}/`, { changefreq: 'daily', priority: '1.0' });
	add(`${base}/about`, { changefreq: 'monthly', priority: '0.6' });

	const regular = sortedEntries.filter((e) => !e.pinned);
	const perPage = SITE_CONFIG.entriesPerPage;
	const totalPages = Math.max(1, Math.ceil(regular.length / perPage));
	for (let p = 2; p <= totalPages; p++) {
		add(`${base}/page/${p}/`, { changefreq: 'weekly', priority: '0.7' });
	}

	for (const e of sortedEntries) {
		add(absolutePostUrl(e.url), { changefreq: 'monthly', priority: '0.7', lastmod: e.date });
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
	)
	.join('\n')}
</urlset>
`;
	fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), body, 'utf8');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
