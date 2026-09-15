import { expect, test } from "bun:test";

import { streamCodingAgent } from "./client";

test("streamCodingAgent parses NDJSON events", async () => {
	const server = Bun.serve({
		port: 0,
		fetch(req) {
			if (
				req.method === "POST" &&
				new URL(req.url).pathname === "/agent/stream"
			) {
				const events = [
					{
						type: "tool-call",
						id: "c1",
						tool: "read_file",
						args: { path: "a.ts" },
					},
					{ type: "tool-result", id: "c1", tool: "read_file", ok: true },
					{ type: "text-delta", text: "Hel" },
					{ type: "text-delta", text: "lo" },
					{
						type: "finish",
						text: "Hello",
						model: "deepseek/deepseek-v4-flash",
					},
				];
				const body = events.map((e) => `${JSON.stringify(e)}\n`).join("");
				return new Response(body, {
					headers: { "Content-Type": "application/x-ndjson" },
				});
			}
			return new Response("Not found", { status: 404 });
		},
	});
	process.env.SERVER_URL = `http://localhost:${server.port}`;

	const seen: string[] = [];
	const response = await streamCodingAgent("Hi", (event) =>
		seen.push(event.type),
	);

	expect(seen).toEqual([
		"tool-call",
		"tool-result",
		"text-delta",
		"text-delta",
		"finish",
	]);
	expect(response.text).toBe("Hello");
	expect(response.toolCalls).toEqual(["read_file"]);
	server.stop(true);
});

test("streamCodingAgent surfaces server errors", async () => {
	const server = Bun.serve({
		port: 0,
		fetch() {
			return new Response(
				`${JSON.stringify({ type: "error", message: "model exploded" })}\n`,
				{ headers: { "Content-Type": "application/x-ndjson" } },
			);
		},
	});
	process.env.SERVER_URL = `http://localhost:${server.port}`;

	await expect(streamCodingAgent("Hi")).rejects.toThrow("model exploded");
	server.stop(true);
});
