import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

export function hasMcpAdapter(pi: ExtensionAPI): boolean {
	try {
		if (pi.getAllTools().some((tool) => tool.name === "mcp")) return true;
		return pi
			.getCommands()
			.some((command) => command.name === "mcp" || command.name === "mcp-auth");
	} catch {
		return false;
	}
}

export function hasMcpAdapterExecutable(): boolean {
	const pathValue = process.env.PATH ?? "";
	const executableNames =
		process.platform === "win32"
			? ["pi-mcp-adapter.cmd", "pi-mcp-adapter.exe", "pi-mcp-adapter"]
			: ["pi-mcp-adapter"];

	for (const dir of pathValue.split(delimiter)) {
		if (!dir) continue;
		for (const name of executableNames) {
			if (existsSync(join(dir, name))) return true;
		}
	}

	return false;
}

export function assertMcpAdapterExists(pi: ExtensionAPI): void {
	if (hasMcpAdapter(pi) || hasMcpAdapterExecutable()) return;
	throw new Error(
		"pi-mcp-adapter not found. Install it first with `pi install npm:pi-mcp-adapter`, restart Pi, then retry.",
	);
}
