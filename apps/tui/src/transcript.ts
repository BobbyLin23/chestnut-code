import type { AgentStreamEvent } from "@chestnut-code/api/agent-stream";
import type { MessagePart } from "./types";

export function formatOutput(value: unknown): string {
	if (typeof value === "string") return value;
	return JSON.stringify(value, null, 2) ?? "";
}

/** Preserve generation order. Text IDs are scoped to a step, not a run. */
export function appendEvent(
	parts: MessagePart[],
	event: AgentStreamEvent,
): MessagePart[] {
	if (event.type === "step-start") {
		return parts.map((part) =>
			part.kind === "tool" ? part : { ...part, complete: true },
		);
	}
	if (
		event.type === "text-start" ||
		event.type === "reasoning-start" ||
		event.type === "text-delta" ||
		event.type === "reasoning-delta" ||
		event.type === "text-end" ||
		event.type === "reasoning-end"
	) {
		const kind = event.type.startsWith("reasoning") ? "reasoning" : "text";
		const index = parts.findLastIndex(
			(part) =>
				part.kind === kind && part.id === event.payload.id && !part.complete,
		);
		const delta =
			"text" in event.payload && typeof event.payload.text === "string"
				? event.payload.text
				: "";
		const complete = event.type.endsWith("-end");
		if (index < 0)
			return [...parts, { kind, id: event.payload.id, text: delta, complete }];
		return parts.map((part, i) =>
			i === index && part.kind !== "tool"
				? { ...part, text: part.text + delta, complete }
				: part,
		);
	}
	let id: string | undefined;
	let update: Partial<Extract<MessagePart, { kind: "tool" }>> = {};
	let inputDelta = "";
	let outputDelta = "";
	switch (event.type) {
		case "tool-call-input-streaming-start":
			id = event.payload.toolCallId;
			update = { tool: event.payload.toolName, status: "input" };
			break;
		case "tool-call-delta":
			id = event.payload.toolCallId;
			inputDelta = event.payload.argsTextDelta;
			if (event.payload.toolName) update.tool = event.payload.toolName;
			break;
		case "tool-call":
			id = event.payload.toolCallId;
			update = {
				tool: event.payload.toolName,
				args: event.payload.args,
				status: "running",
			};
			break;
		case "tool-result":
			id = event.payload.toolCallId;
			update = {
				tool: event.payload.toolName,
				args: event.payload.args,
				result: formatOutput(event.payload.result),
				status: event.payload.isError ? "error" : "done",
			};
			break;
		case "tool-error":
			id = event.payload.toolCallId;
			update = {
				tool: event.payload.toolName,
				args: event.payload.args,
				result: formatOutput(event.payload.error),
				status: "error",
			};
			break;
		case "data-sandbox-stdout":
		case "data-sandbox-stderr":
			id = event.data.toolCallId;
			outputDelta = event.data.output;
			break;
		case "data-sandbox-exit":
			id = event.data.toolCallId;
			update = {
				exitCode: event.data.exitCode,
				status: event.data.success ? "running" : "error",
			};
			break;
		default:
			return parts;
	}
	if (!id) return parts;
	const index = parts.findIndex(
		(part) => part.kind === "tool" && part.id === id,
	);
	const previous = index < 0 ? undefined : parts[index];
	const tool: Extract<MessagePart, { kind: "tool" }> =
		previous?.kind === "tool"
			? previous
			: {
					kind: "tool",
					id,
					tool: "Tool",
					input: "",
					output: "",
					status: "input",
				};
	const next = {
		...tool,
		...update,
		status:
			tool.status === "error"
				? ("error" as const)
				: (update.status ?? tool.status),
		args: update.args ?? tool.args,
		input: tool.input + inputDelta,
		output: tool.output + outputDelta,
	};
	return index < 0
		? [...parts, next]
		: parts.map((part, i) => (i === index ? next : part));
}

export function completeParts(parts: MessagePart[]): MessagePart[] {
	return parts.map((part) =>
		part.kind === "tool"
			? {
					...part,
					status:
						part.status === "running" || part.status === "input"
							? "interrupted"
							: part.status,
				}
			: { ...part, complete: true },
	);
}
