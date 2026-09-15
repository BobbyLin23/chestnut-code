import { describe, expect, test } from "bun:test";

import { attachMentionedFiles, loadWorkspace } from "./files";

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
});
