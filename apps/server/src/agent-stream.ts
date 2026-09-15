import { codingAgent, DEFAULT_MODEL } from "./mastra";

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

export async function streamCodingAgentRun(
	message: string,
	send: (event: AgentStreamEvent) => void,
) {
	const result = await codingAgent.stream(message, { maxSteps: 10 });
	let text = "";

	for await (const chunk of result.fullStream) {
		switch (chunk.type) {
			case "tool-call":
				send({
					type: "tool-call",
					id: chunk.payload.toolCallId,
					tool: chunk.payload.toolName,
					args: chunk.payload.args,
				});
				break;
			case "tool-result":
				send({
					type: "tool-result",
					id: chunk.payload.toolCallId,
					tool: chunk.payload.toolName,
					ok: !chunk.payload.isError,
				});
				break;
			case "text-delta":
				text += chunk.payload.text;
				send({ type: "text-delta", text: chunk.payload.text });
				break;
			case "error":
				send({
					type: "error",
					message:
						typeof chunk.payload.error === "string"
							? chunk.payload.error
							: JSON.stringify(chunk.payload.error),
				});
				break;
		}
	}

	send({ type: "finish", text, model: DEFAULT_MODEL });
}
