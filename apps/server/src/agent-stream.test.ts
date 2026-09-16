import { expect, mock, test } from "bun:test";

const chunks = [
	{
		type: "reasoning-delta",
		runId: "r",
		from: "AGENT",
		payload: { id: "r0", text: "Inspect" },
	},
	{
		type: "tool-result",
		runId: "r",
		from: "AGENT",
		payload: {
			toolCallId: "c",
			toolName: "bash",
			result: { stdout: "hello", exitCode: 0 },
		},
	},
	{ type: "data-sandbox-stdout", data: { toolCallId: "c", output: "hello" } },
];
const stream = mock(async () => ({
	fullStream: (async function* () {
		yield* chunks;
	})(),
}));
mock.module("./mastra", () => ({ codingAgent: { stream } }));
const { streamCodingAgentRun } = await import("./agent-stream");

test("forwards every original chunk and passes cancellation to Mastra", async () => {
	const abort = new AbortController();
	const seen: unknown[] = [];
	await streamCodingAgentRun(
		"hello",
		async (chunk) => {
			seen.push(chunk);
		},
		abort.signal,
	);
	expect(seen).toEqual(chunks);
	expect(seen[1]).toBe(chunks[1]);
	expect(stream).toHaveBeenLastCalledWith("hello", {
		maxSteps: 10,
		abortSignal: abort.signal,
	});
});

test("awaits the writer and stops forwarding after disconnect", async () => {
	const abort = new AbortController();
	const seen: unknown[] = [];
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const run = streamCodingAgentRun(
		"hello",
		async (chunk) => {
			seen.push(chunk);
			await gate;
		},
		abort.signal,
	);
	await Bun.sleep(0);
	expect(seen).toHaveLength(1);
	abort.abort();
	release();
	await run;
	expect(seen).toHaveLength(1);
});
