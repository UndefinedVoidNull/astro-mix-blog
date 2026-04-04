import path from 'node:path';

/** Matches a leading `[YYYY-MM-DD]` on a filename stem (no extension). */
export const BRACKET_TITLE_RE = /^\[(\d{4}-\d{2}-\d{2})\](.*)$/;

/**
 * Remove `[YYYY-MM-DD]` from the start of a stem. If nothing remains, use `post`
 * (same fallback as HTML output naming).
 */
export function stripBracketDateFromStem(stem) {
	const m = stem.match(BRACKET_TITLE_RE);
	if (!m) return stem;
	const rest = (m[2] || '').trim();
	return rest || 'post';
}

/** Strip bracket date from a basename that includes an extension, e.g. `[2026-01-01]x.png` → `x.png`. */
export function stripBracketDateFromBasename(basename) {
	const ext = path.extname(basename);
	const stem = path.basename(basename, ext);
	const newStem = stripBracketDateFromStem(stem);
	return `${newStem}${ext}`;
}

/**
 * Strip bracket date from the final path segment only (relative path from a tree root).
 */
export function stripBracketDateFromRelativePath(rel) {
	const parts = rel.split(path.sep);
	if (parts.length === 0) return rel;
	parts[parts.length - 1] = stripBracketDateFromBasename(parts[parts.length - 1]);
	return path.join(...parts);
}

/**
 * Strip bracket date from the last segment of a slash path without `.md` (Markdown URL slug).
 */
export function stripBracketDateFromMdSlug(slashPathNoExt) {
	const parts = slashPathNoExt.split('/');
	if (parts.length === 0) return slashPathNoExt;
	parts[parts.length - 1] = stripBracketDateFromStem(parts[parts.length - 1]);
	return parts.join('/');
}

/**
 * Public URL filename for an Astro-rendered Markdown post: flat `/post/<this>.html`.
 * Uses basename only (ignores `pin/` etc.). Matches `htmlOutputFileName` style sanitization.
 */
export function processedMdEntryHtmlFilename(mdBasename) {
	const ext = path.extname(mdBasename);
	const stem = path.basename(mdBasename, ext);
	const stripped = stripBracketDateFromStem(stem);
	const spaced = stripped.trim().replace(/\s+/g, '-');
	const safe = (spaced || 'post').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
	return `${safe}.html`;
}
