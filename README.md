# pi-figma-remote-auth

A Pi extension that handles **OAuth authentication and MCP config** for Figma's hosted Remote MCP server (`https://mcp.figma.com/mcp`), so that an existing [`pi-mcp-adapter`](https://github.com/nicobailon/pi-mcp-adapter) install can expose Figma tools inside Pi.

## What this does

In short, it does two things:

1. **Writes the MCP server config** (`mcpServers.figma`) into Pi's MCP config file, pointing at Figma's remote endpoint with `auth: "oauth"`.
2. **Runs the OAuth flow** against Figma and saves the resulting tokens in `pi-mcp-adapter`'s auth store, so the adapter can connect without re-prompting.

The OAuth step uses a workaround for Figma's MCP client allowlist: the dynamic client registration registers as `client_name: "Codex"` (which Figma allows), then the credentials are stored in the format `pi-mcp-adapter` expects. Same idea as [`mcp-auth-helper`](https://github.com/sdaoudi/mcp-auth-helper), but writing into the Pi adapter's storage instead of OpenCode's.

This is **not** the local Figma desktop MCP bridge — it only configures the remote endpoint.

## Prerequisite

Install `pi-mcp-adapter` first:

```sh
pi install npm:pi-mcp-adapter
```

Restart Pi.

## Install this package

From npm:

```sh
pi install npm:pi-figma-remote-auth
```

Or from a local checkout:

```sh
pi install /absolute/path/to/pi-figma-remote-auth
```

Or for one run, without installing:

```sh
pi -e npm:pi-figma-remote-auth
```

## Usage

Inside Pi:

```text
/figma-remote-auth setup
/figma-remote-auth login
```

During `login`, Pi prints the Figma authorization URL. Copy it from the notification and open it in your browser — the extension does **not** auto-open and Pi's TUI may not render the URL as clickable. After authorizing, restart Pi (or `/mcp reconnect figma`) so `pi-mcp-adapter` reloads MCP config.

Use Figma tools through the adapter proxy:

```ts
mcp({ search: "figma" });
mcp({ connect: "figma" });
mcp({ tool: "figma_TOOL_NAME", args: "{}" });
```

## Commands

```text
/figma-remote-auth help
/figma-remote-auth status [--server figma]
/figma-remote-auth setup  [--global|--project|--shared] [--server figma] [--url https://mcp.figma.com/mcp] [--direct-tools] [--keep-alive]
/figma-remote-auth login  [--server figma] [--url https://mcp.figma.com/mcp] [--client-name Codex] [--port <port>]
/figma-remote-auth logout [--server figma]
```

`setup` and `login` first check that `pi-mcp-adapter` exists. If missing, install it before continuing.

By default, `login` uses a random free localhost callback port so it does not collide with `pi-mcp-adapter`'s own OAuth callback server. Use `--port` only when you need a fixed callback URL.

Config targets:

- `--global` (default): writes `~/.pi/agent/mcp.json` or `$PI_CODING_AGENT_DIR/mcp.json`
- `--project`: writes `.pi/mcp.json`
- `--shared`: writes `.mcp.json`

Token store (written by `login`, removed by `logout`). `pi-mcp-adapter` addresses each
server by `sha256-<sha256(serverName)>`, so for `figma` the directory is
`sha256-5b79d0d574eedd091c02692026ecfa1c617af2432c0a9b401e623e67d78a179c`:

- `$MCP_OAUTH_DIR/sha256-<hash>/tokens.json` when `$MCP_OAUTH_DIR` is set
- otherwise `~/.pi/agent/mcp-oauth/sha256-<hash>/tokens.json` or `$PI_CODING_AGENT_DIR/mcp-oauth/sha256-<hash>/tokens.json`

`pi-mcp-adapter` >= 2.13.0 imports that plaintext file into the OS credential store
(Keychain / Credential Manager / Secret Service) on the next connect and deletes it,
so a missing file after a successful `login` is expected. `logout` also removes token
files left in the pre-2.13.0 `<base>/<serverName>/tokens.json` layout, but it cannot
clear credentials already imported into the OS store — use `/mcp-auth` for that.

## Security

Tokens are written with file mode `0600`. Pi packages execute code with local system access; review before installing.
