import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

for (const rel of ['dist', path.join('public', 'post')]) {
	const target = path.join(ROOT, rel);
	fs.rmSync(target, { recursive: true, force: true });
	console.log(`clean: removed ${rel}`);
}
