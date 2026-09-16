import { afterEach, describe, expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";

import { App, getSuggestions } from "./app";
import type { AgentResponse, AgentStreamEvent } from "./client";

let setup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(async () => {
	await act(async () => setup?.renderer.destroy());
	setup = undefined;
});

describe("coding agent TUI", () => {
	const noConnectionCheck = () => new Promise<boolean>(() => undefined);

	test("keeps reasoning and interrupted tool input after a stream failure", async () => {
		setup = await testRender(
			<App
				checkConnection={noConnectionCheck}
				initialInput="Inspect"
				runAgent={async (_message, emit) => {
					emit?.({
						type: "reasoning-delta",
						runId: "r",
						from: "AGENT",
						payload: { id: "r0", text: "Check the config first." },
					});
					emit?.({
						type: "tool-call",
						runId: "r",
						from: "AGENT",
						payload: {
							toolCallId: "c",
							toolName: "read_file",
							args: { path: "config.ts" },
						},
					});
					throw new Error("Connection lost");
				}}
			/>,
			{ width: 80, height: 30 },
		);
		await act(async () => setup?.mockInput.pressEnter());
		const frame = await setup.waitForFrame((value) =>
			value.includes("Connection lost"),
		);
		expect(frame).toContain("Reasoning");
		expect(frame).toContain("Check the config first.");
		expect(frame).toContain("read_file");
		expect(frame).toContain("interrupted");
		expect(frame).toContain("config.ts");
		expect(frame).not.toContain("✓ read_file");
	});

	test("renders the model and primary interaction hints", async () => {
		setup = await testRender(<App checkConnection={noConnectionCheck} />, {
			width: 100,
			height: 30,
		});
		await setup.renderOnce();
		const frame = setup.captureCharFrame();

		expect(frame).toContain("deepseek/deepseek-v4-flash");
		expect(frame).toContain("/ commands");
		expect(frame).toContain("@ files");
		expect(frame).toContain("Code with an agent in your terminal");
	});

	test("shows a filtered command palette", async () => {
		setup = await testRender(
			<App initialInput="/to" checkConnection={noConnectionCheck} />,
			{ width: 100, height: 30 },
		);
		await setup.renderOnce();
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Commands");
		expect(frame).toContain("/tools");
		expect(frame).not.toContain("/clear");
	});

	test("shows matching workspace files for an @ mention", async () => {
		setup = await testRender(
			<App
				initialInput="Review @app"
				files={[
					"README.md",
					"apps/tui/src/app.tsx",
					"packages/api/src/index.ts",
				]}
				checkConnection={noConnectionCheck}
			/>,
			{ width: 100, height: 30 },
		);
		await setup.renderOnce();
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Mention a file");
		expect(frame).toContain("@apps/tui/src/app.tsx");
		expect(frame).not.toContain("@README.md");
	});

	test("opens the file mention menu while typing an @ mention", async () => {
		setup = await testRender(
			<App
				files={["apps/tui/src/app.tsx", "README.md"]}
				checkConnection={noConnectionCheck}
			/>,
			{ width: 100, height: 30 },
		);
		await setup.renderOnce();

		await act(async () => {
			await setup?.mockInput.typeText("Review @app");
		});
		const frame = await setup.waitForFrame((nextFrame) =>
			nextFrame.includes("Mention a file"),
		);

		expect(frame).toContain("@apps/tui/src/app.tsx");
	});

	test("completes a selected file mention without sending", async () => {
		let requests = 0;
		setup = await testRender(
			<App
				initialInput="Review @app"
				files={["apps/tui/src/app.tsx"]}
				checkConnection={noConnectionCheck}
				runAgent={async () => {
					requests += 1;
					throw new Error("This request should not run");
				}}
			/>,
			{ width: 100, height: 30 },
		);

		await act(async () => setup?.mockInput.pressEnter());
		await setup.renderOnce();
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Review @apps/tui/src/app.tsx");
		expect(frame).not.toContain("Mention a file");
		expect(requests).toBe(0);
	});

	test("ranks only the relevant trigger type", () => {
		expect(getSuggestions("/mod", [])).toEqual([
			{
				label: "/model",
				description: "Show the active model",
				value: "/model ",
			},
		]);
		expect(
			getSuggestions("Fix @api", ["src/app.tsx", "packages/api/index.ts"]),
		).toHaveLength(1);
	});

	test("sends chat messages and renders tool activity", async () => {
		let received = "";
		setup = await testRender(
			<App
				checkConnection={noConnectionCheck}
				runAgent={async (message) => {
					received = message;
					return {
						model: "deepseek/deepseek-v4-flash",
						text: "I inspected the code and verified the update.",
						tools: ["read_file", "bash"],
						toolCalls: ["read_file", "bash"],
					};
				}}
			/>,
			{ width: 100, height: 30 },
		);

		await act(async () => {
			await setup?.mockInput.typeText("Inspect the TUI");
			setup?.mockInput.pressEnter();
		});
		const frame = await setup.waitForFrame((nextFrame) =>
			nextFrame.includes("verified the update"),
		);

		expect(received).toBe("Inspect the TUI");
		expect(frame).toContain("Reasoning & actions");
		expect(frame).toContain("✓ read_file");
		expect(frame).toContain("✓ bash");
	});

	test("renders live tool steps and streamed text while the agent works", async () => {
		let emit: ((event: AgentStreamEvent) => void) | undefined;
		let resolveAgent: ((response: AgentResponse) => void) | undefined;
		setup = await testRender(
			<App
				checkConnection={noConnectionCheck}
				runAgent={(_message, onEvent) =>
					new Promise<AgentResponse>((resolve) => {
						emit = onEvent;
						resolveAgent = resolve;
					})
				}
			/>,
			{ width: 100, height: 30 },
		);
		await setup.renderOnce();

		await act(async () => {
			await setup?.mockInput.typeText("Inspect the TUI");
			setup?.mockInput.pressEnter();
		});
		await act(async () => {
			emit?.({
				type: "reasoning-delta",
				runId: "run",
				from: "AGENT",
				payload: { id: "r0", text: "Inspecting the renderer." },
			});
			emit?.({
				type: "tool-call",
				runId: "run",
				from: "AGENT",
				payload: {
					toolCallId: "call-1",
					toolName: "read_file",
					args: { path: "apps/tui/src/app.tsx" },
				},
			});
		});
		await setup.renderOnce();
		let frame = setup.captureCharFrame();
		expect(frame).toContain("read_file");
		expect(frame).toContain("Thinking…");
		expect(frame).toContain("Inspecting the renderer.");
		expect(frame).toContain("apps/tui/src/app.tsx");
		expect(frame).toContain("Agent is working");

		await act(async () => {
			emit?.({
				type: "tool-result",
				runId: "run",
				from: "AGENT",
				payload: {
					toolCallId: "call-1",
					toolName: "read_file",
					result: "File contents",
				},
			});
			emit?.({
				type: "text-delta",
				runId: "run",
				from: "AGENT",
				payload: { id: "txt-0", text: "Streaming " },
			});
			emit?.({
				type: "text-delta",
				runId: "run",
				from: "AGENT",
				payload: { id: "txt-0", text: "the answer…" },
			});
		});
		await setup.renderOnce();
		frame = setup.captureCharFrame();
		expect(frame).toContain("✓");
		expect(frame).toContain("apps/tui/src/app.tsx");
		expect(frame).toContain("File contents");
		expect(frame).toContain("Streaming the answer…");

		await act(async () => {
			resolveAgent?.({
				model: "deepseek/deepseek-v4-flash",
				text: "Streaming the answer…",
				tools: ["read_file"],
				toolCalls: ["read_file"],
			});
		});
		const finalFrame = await setup.waitForFrame(
			(nextFrame) => !nextFrame.includes("Agent is working"),
		);
		expect(finalFrame).toContain("✓ read_file");
		expect(finalFrame).toContain("File contents");
		expect(finalFrame).toContain("Reasoning");
		expect(finalFrame).toContain("Inspecting the renderer.");
		expect(finalFrame).toContain("Streaming the answer…");
		expect(finalFrame).not.toContain("Agent is working");
	});
});
