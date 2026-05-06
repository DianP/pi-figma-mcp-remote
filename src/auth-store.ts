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

export function getAuthFilePath(serverName: string): string {
	const base = process.env.MCP_OAUTH_DIR?.trim() || getAgentPath("mcp-oauth");
	return join(expandHome(base), serverName, "tokens.json");
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

export function removeAuthFile(serverName: string): boolean {
	const authPath = getAuthFilePath(serverName);
	if (!existsSync(authPath)) return false;
	rmSync(authPath, { force: true });
	return true;
}
