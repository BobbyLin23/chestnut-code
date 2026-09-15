import { fileURLToPath } from "node:url";
import { createCodingAgent } from "@mastra/core/coding-agent";
import {
	LocalFilesystem,
	LocalSandbox,
	WORKSPACE_TOOLS,
	Workspace,
} from "@mastra/core/workspace";

export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
export const CODING_AGENT_TOOLS = [
	"list_files",
	"read_file",
	"write_file",
	"edit_file",
	"grep",
	"bash",
] as const;

const workspacePath = fileURLToPath(
	new URL("../../../../../.coding-agent-workspace/", import.meta.url),
);

const workspace = new Workspace({
	id: "coding-agent-workspace",
	name: "Coding Agent Workspace",
	filesystem: new LocalFilesystem({
		id: "coding-agent-filesystem",
		basePath: workspacePath,
		contained: true,
	}),
	sandbox: new LocalSandbox({
		id: "coding-agent-sandbox",
		workingDirectory: workspacePath,
		timeout: 30_000,
	}),
	tools: {
		enabled: false,
		[WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: {
			enabled: true,
			name: "list_files",
		},
		[WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: {
			enabled: true,
			name: "read_file",
			maxOutputTokens: 8_000,
		},
		[WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
			enabled: true,
			name: "write_file",
			requireReadBeforeWrite: true,
		},
		[WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
			enabled: true,
			name: "edit_file",
			requireReadBeforeWrite: true,
		},
		[WORKSPACE_TOOLS.FILESYSTEM.GREP]: {
			enabled: true,
			name: "grep",
			maxOutputTokens: 8_000,
		},
		[WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
			enabled: true,
			name: "bash",
			maxOutputTokens: 8_000,
		},
	},
});

await workspace.init();

export const codingAgent = createCodingAgent({
	id: "coding-agent",
	name: "Chestnut Coding Agent",
	instructions: `You are a practical coding agent working in a dedicated workspace.

Follow this loop:
1. Inspect relevant files before changing them. Use list_files and grep to discover code, then read_file for context.
2. Make the smallest correct change with edit_file. Use write_file for new files.
3. Use bash to run focused checks or tests after editing.
4. Summarize what changed and report verification honestly.

Never access or modify files outside the workspace. Avoid destructive commands. Ask one focused question only when the task cannot be completed safely without missing information.`,
	model: DEFAULT_MODEL,
	workspace,
});
