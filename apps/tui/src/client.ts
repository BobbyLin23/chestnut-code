export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export type AgentResponse = {
	model: string;
	text: string;
	tools: readonly string[];
	toolCalls: string[];
};

export type AgentStreamEvent =
	| {
			type: "tool-call";
			id: string;
			tool: string;
			args?: Record<string, unknown>;
	  }
	| { type: "tool-result"; id: string; tool: string; ok: boolean }
	| { type: "text-delta"; text: string }
	| { type: "finish"; text: string; model: string }
	| { type: "error"; message: string };

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
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message }),
	});
	if (!response.ok || !response.body) {
		throw new Error(`The agent request failed (HTTP ${response.status}).`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let text = "";
	const toolCalls: string[] = [];

	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		buffer += decoder.decode(value, { stream: true });
		for (;;) {
			const newlineIndex = buffer.indexOf("\n");
			if (newlineIndex === -1) {
				break;
			}
			const line = buffer.slice(0, newlineIndex);
			buffer = buffer.slice(newlineIndex + 1);
			if (!line.trim()) {
				continue;
			}
			const event = JSON.parse(line) as AgentStreamEvent;
			switch (event.type) {
				case "tool-call":
					toolCalls.push(event.tool);
					break;
				case "text-delta":
					text += event.text;
					break;
				case "finish":
					text = event.text;
					break;
				case "error":
					throw new Error(event.message);
			}
			onEvent?.(event);
		}
	}

	return { model: DEFAULT_MODEL, text, toolCalls, tools: toolCalls };
}

export async function checkServer() {
	try {
		const response = await fetch(getServerUrl());
		return response.ok;
	} catch {
		return false;
	}
}
