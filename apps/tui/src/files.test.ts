import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	attachMentionedFiles,
	getWorkspaceArgument,
	loadWorkspace,
} from "./files";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })),
	);
});

describe("workspace file mentions", () => {
	test("attaches only allowlisted mentioned files", async () => {
		const workspace = loadWorkspace();
		const prompt = await attachMentionedFiles(
			"Review @apps/tui/README.md and @not-allowed.txt",
			workspace.files,
			workspace.rootPath,
		);

		expect(prompt).toContain("--- apps/tui/README.md ---");
		expect(prompt).toContain("# Chestnut Code TUI");
		expect(prompt).not.toContain("--- not-allowed.txt ---");
	});

	test("keeps the API prompt within its maximum size", async () => {
		const workspace = loadWorkspace();
		const prompt = await attachMentionedFiles(
			`Summarize @apps/tui/src/app.tsx ${"x".repeat(3900)}`,
			workspace.files,
			workspace.rootPath,
		);

		expect(prompt.length).toBeLessThanOrEqual(4000);
	});

	test("loads mentions from the explicitly selected folder", async () => {
		const rootPath = await mkdtemp(join(tmpdir(), "chestnut-tui-"));
		temporaryDirectories.push(rootPath);
		await mkdir(join(rootPath, "src"));
		await writeFile(
			join(rootPath, "src", "selected.ts"),
			"export const selected = true;\n",
		);

		const workspace = loadWorkspace(rootPath);

		expect(workspace.rootPath).toBe(rootPath);
		expect(workspace.files).toEqual(["src/selected.ts"]);
		await expect(
			attachMentionedFiles(
				"Review @src/selected.ts",
				workspace.files,
				workspace.rootPath,
			),
		).resolves.toContain("export const selected = true;");
	});

	test("accepts positional and named workspace arguments", () => {
		expect(getWorkspaceArgument(["/projects/example"])).toBe(
			"/projects/example",
		);
		expect(getWorkspaceArgument(["--workspace", "/projects/named"])).toBe(
			"/projects/named",
		);
	});
});
