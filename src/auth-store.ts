import { createHash } from "node:crypto";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { expandHome, getAgentPath } from "./paths.js";

export interface RegisteredClient {
	clientId: string;
	clientSecret?: string;
	clientIdIssuedAt?: number;
	clientSecretExpiresAt?: number;
}

export interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	scope?: string;
	token_type?: string;
}

export interface AdapterAuthEntry {
	tokens?: {
		accessToken: string;
		refreshToken?: string;
		expiresAt?: number;
		scope?: string;
	};
	clientInfo?: RegisteredClient;
	codeVerifier?: string;
	oauthState?: string;
	serverUrl?: string;
}

/**
 * Token file paths for a server, current layout first.
 *
 * pi-mcp-adapter >= 2.13.0 keeps persistent OAuth credentials in the OS
 * credential store and imports legacy plaintext entries from
 * `<base>/sha256-<sha256(serverName)>/tokens.json`. Writing only to the plain
 * `<base>/<serverName>/tokens.json` directory that older releases used leaves
 * the adapter unaware of the credentials, so it retries its own dynamic client
 * registration and Figma rejects that with HTTP 403.
 */
export function getAuthFilePathCandidates(serverName: string): string[] {
	const base = expandHome(
		process.env.MCP_OAUTH_DIR?.trim() || getAgentPath("mcp-oauth"),
	);
	const account = `sha256-${createHash("sha256").update(serverName, "utf8").digest("hex")}`;
	return [
		join(base, account, "tokens.json"),
		join(base, serverName, "tokens.json"),
	];
}

/** Path `login` writes to. */
export function getAuthFilePath(serverName: string): string {
	return getAuthFilePathCandidates(serverName)[0] as string;
}

/** First existing token file across both layouts, if any. */
export function findAuthFilePath(serverName: string): string | undefined {
	return getAuthFilePathCandidates(serverName).find((path) => existsSync(path));
}

export function saveAdapterAuth(
	serverName: string,
	serverUrl: string,
	client: RegisteredClient,
	tokens: TokenResponse,
): string {
	const now = Math.floor(Date.now() / 1000);
	const entry: AdapterAuthEntry = {
		tokens: {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: tokens.expires_in ? now + tokens.expires_in : undefined,
			scope: tokens.scope,
		},
		clientInfo: client,
		serverUrl,
	};

	const authPath = getAuthFilePath(serverName);
	mkdirSync(dirname(authPath), { recursive: true, mode: 0o700 });
	writeFileSync(authPath, `${JSON.stringify(entry, null, 2)}\n`, {
		encoding: "utf8",
		mode: 0o600,
	});
	try {
		chmodSync(authPath, 0o600);
	} catch {
		// Best effort on platforms without POSIX chmod.
	}
	return authPath;
}

export function readAuthEntry(path: string): AdapterAuthEntry | undefined {
	if (!existsSync(path)) return undefined;
	try {
		return JSON.parse(readFileSync(path, "utf8")) as AdapterAuthEntry;
	} catch {
		return undefined;
	}
}

/** Removes plaintext token files from every known layout. */
export function removeAuthFile(serverName: string): boolean {
	let removed = false;
	for (const authPath of getAuthFilePathCandidates(serverName)) {
		if (!existsSync(authPath)) continue;
		rmSync(authPath, { force: true });
		removed = true;
	}
	return removed;
}
