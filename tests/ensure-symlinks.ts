/**
 * Pre-test script: ensures compat symlinks exist for packages that moved scopes.
 *
 * Run automatically via the `pretest` npm script:
 *   node --experimental-strip-types tests/ensure-symlinks.ts
 *
 * Each entry maps [oldPackageName, newPackageName]. If the new package is
 * installed and the old name is absent, a directory symlink is created so that
 * any code still referencing the old name continues to resolve without further
 * changes.
 */
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const nodeModules = join(projectRoot, "node_modules");

const COMPAT: readonly [oldPkg: string, newPkg: string][] = [
	["@mariozechner/pi-coding-agent", "@earendil-works/pi-coding-agent"],
];

let failed = false;

for (const [oldPkg, newPkg] of COMPAT) {
	const target = join(nodeModules, newPkg);

	if (!existsSync(target)) {
		console.error(`[ensure-symlinks] MISSING: node_modules/${newPkg} — run npm install`);
		failed = true;
		continue;
	}

	const link = join(nodeModules, oldPkg);

	if (existsSync(link)) {
		console.log(`[ensure-symlinks] OK: ${oldPkg}`);
		continue;
	}

	const scopeDir = oldPkg.startsWith("@")
		? join(nodeModules, oldPkg.split("/")[0])
		: nodeModules;

	mkdirSync(scopeDir, { recursive: true });
	symlinkSync(relative(scopeDir, target), link, "dir");
	console.log(`[ensure-symlinks] Created: ${oldPkg} → ${newPkg}`);
}

if (failed) process.exit(1);
