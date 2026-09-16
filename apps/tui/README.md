# Chestnut Code TUI

Requires [Bun](https://bun.sh/) 1.3.0 or later.

To install dependencies:

```bash
bun install
```

Start the coding-agent server in one terminal, then the TUI in another:

```bash
bun run dev:server
bun run dev:tui -- /path/to/project
```

The optional folder argument selects the agent workspace. You can also write it
as `--workspace /path/to/project`. When omitted, the TUI uses the current Git
repository root. File mentions and all server-side coding tools use this same
folder.

The TUI connects to `http://localhost:3150` by default. Set `SERVER_URL` to use
another server. The server requires `DEEPSEEK_API_KEY`.

Type `/` to open the command palette and `@` to mention tracked workspace files.
Use the arrow keys to choose, Enter or Tab to complete, and Enter to send.

To typecheck:

```bash
bun run typecheck
```

The active model is `deepseek/deepseek-v4-flash`.
