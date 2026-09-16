import { afterAll, afterEach, expect, spyOn, test } from "bun:test";
import { type AgentStreamEvent, streamCodingAgent } from "./client";

const fetchSpy = spyOn(globalThis, "fetch");
afterEach(() => fetchSpy.mockReset());
afterAll(() => fetchSpy.mockRestore());

function serve(body: string, contentType = "text/event-stream") {
	const bytes = new TextEncoder().encode(body);
	let index = 0;
	// One byte per read exercises split UTF-8, CRLF, and SSE field boundaries.
	fetchSpy.mockResolvedValue(
		new Response(
			new ReadableStream({
				pull(controller) {
					if (index === bytes.length) controller.close();
					else controller.enqueue(bytes.slice(index, ++index));
				},
			}),
			{ headers: { "Content-Type": contentType } },
		),
	);
}

test("parses fragmented SSE, forwards complete payloads and keeps actual model", async () => {
	serve(
		': heartbeat\r\nevent: message\r\ndata: {"type":"reasoning-delta",\r\ndata: "payload":{"id":"r","text":"Think"}}\r\n\r\n' +
			[
				{
					type: "tool-call",
					payload: {
						toolCallId: "c1",
						toolName: "bash",
						args: { command: "echo 好" },
					},
				},
				{
					type: "data-sandbox-stdout",
					data: { toolCallId: "c1", output: "好\n" },
				},
				{
					type: "tool-result",
					payload: {
						toolCallId: "c1",
						toolName: "bash",
						result: { stdout: "好", exitCode: 0 },
					},
				},
				{ type: "text-delta", payload: { id: "t", text: "Hello 好" } },
				{
					type: "finish",
					payload: {
						stepResult: { reason: "stop" },
						metadata: { modelId: "actual-model" },
					},
				},
			]
				.map((event) => `data: ${JSON.stringify(event)}\n\n`)
				.join(""),
	);
	const seen: AgentStreamEvent[] = [];
	const response = await streamCodingAgent("Hi", (event) => seen.push(event));
	expect(seen.map((event) => event.type)).toEqual([
		"reasoning-delta",
		"tool-call",
		"data-sandbox-stdout",
		"tool-result",
		"text-delta",
		"finish",
	]);
	expect(seen[3]).toMatchObject({
		payload: { result: { stdout: "好", exitCode: 0 } },
	});
	expect(response).toEqual({
		model: "actual-model",
		text: "Hello 好",
		tools: ["bash"],
		toolCalls: ["bash"],
	});
});

test.each(["error", "transport-error"])(
	"surfaces %s after notifying the consumer",
	async (type) => {
		serve(
			`data: ${JSON.stringify({ type, payload: { error: "model exploded" } })}\n\n`,
		);
		const seen: string[] = [];
		await expect(
			streamCodingAgent("Hi", (event) => seen.push(event.type)),
		).rejects.toThrow("model exploded");
		expect(seen).toEqual([type]);
	},
);

test("rejects truncated streams instead of reporting success", async () => {
	serve(
		'data: {"type":"text-delta","payload":{"id":"t","text":"partial"}}\n\n',
	);
	await expect(streamCodingAgent("Hi")).rejects.toThrow("before finish");
});

test("rejects a failed finish and unexpected content type", async () => {
	serve(
		'data: {"type":"finish","payload":{"stepResult":{"reason":"error"}}}\n\n',
	);
	await expect(streamCodingAgent("Hi")).rejects.toThrow("Agent stopped: error");
	serve("not SSE", "application/x-ndjson");
	await expect(streamCodingAgent("Hi")).rejects.toThrow(
		"Expected an SSE response",
	);
});
