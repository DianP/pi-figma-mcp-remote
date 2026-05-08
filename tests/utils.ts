import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Resolves an absolute path into a package inside node_modules.
 * Use this instead of creating symlinks when you need a concrete file path
 * during tests (e.g. for dynamic imports or path assertions).
 *
 * @example
 *   resolveDeepPath("@earendil-works/pi-coding-agent", "dist/index.js")
 */
export function resolveDeepPath(packageName: string, ...subpaths: string[]): string {
	return join(projectRoot, "node_modules", packageName, ...subpaths);
}
