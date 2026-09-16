import type { AgentStreamEvent } from "@chestnut-code/api/agent-stream";
import { createParser } from "eventsource-parser";
import { formatOutput } from "./transcript";

export type { AgentStreamEvent } from "@chestnut-code/api/agent-stream";
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export type AgentResponse = {
	model: string;
	text: string;
	tools: readonly string[];
	toolCalls: string[];
};

export type RunAgent = (
	message: string,
	onEvent?: (event: AgentStreamEvent) => void,
) => Promise<AgentResponse>;

export function getServerUrl() {
	return (process.env.SERVER_URL ?? "http://localhost:3150").replace(/\/$/, "");
}

export async function streamCodingAgent(
	message: string,
	onEvent?: (event: AgentStreamEvent) => void,
): Promise<AgentResponse> {
	const response = await fetch(`${getServerUrl()}/agent/stream`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "text/event-stream",
		},
		body: JSON.stringify({ message }),
	});
	if (!response.ok || !response.body) {
		throw new Error(`The agent request failed (HTTP ${response.status}).`);
	}
	if (!response.headers.get("content-type")?.startsWith("text/event-stream")) {
		await response.body.cancel();
		throw new Error("Expected an SSE response from the agent.");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let text = "";
	let model = DEFAULT_MODEL;
	let finished = false;
	const toolCalls: string[] = [];
	const parser = createParser({
		onEvent({ data }) {
			const event = JSON.parse(data) as AgentStreamEvent;
			onEvent?.(event);
			switch (event.type) {
				case "tool-call":
					toolCalls.push(event.payload.toolName);
					break;
				case "text-delta":
					text += event.payload.text;
					break;
				case "finish": {
					const reason = event.payload.stepResult.reason;
					if (reason === "error" || reason === "tripwire")
						throw new Error(`Agent stopped: ${reason}`);
					finished = true;
					const modelId = event.payload.metadata.modelId;
					if (typeof modelId === "string") model = modelId;
					break;
				}
				case "error":
				case "transport-error":
					throw new Error(formatOutput(event.payload.error));
				case "abort":
					throw new Error("Agent stream was aborted.");
			}
		},
	});
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			parser.feed(decoder.decode(value, { stream: true }));
		}
		parser.feed(decoder.decode());
		if (!finished) throw new Error("Agent stream ended before finish.");
		return { model, text, toolCalls, tools: toolCalls };
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

export async function checkServer() {
	try {
		return (await fetch(getServerUrl())).ok;
	} catch {
		return false;
	}
}
