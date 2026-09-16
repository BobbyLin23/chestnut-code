import { expect, test } from "bun:test";
import type { AgentStreamEvent } from "./client";
import { appendEvent, completeParts } from "./transcript";
import type { MessagePart } from "./types";

const base = { runId: "run", from: "AGENT" } as const;

test("sandbox exit failure is not overwritten by a tool-result without isError", () => {
	const events: AgentStreamEvent[] = [
		{
			...base,
			type: "tool-call",
			payload: { toolCallId: "c", toolName: "bash" },
		},
		{
			type: "data-sandbox-exit",
			data: { toolCallId: "c", exitCode: 7, success: false },
		},
		{
			...base,
			type: "tool-result",
			payload: { toolCallId: "c", toolName: "bash", result: "Exit code: 7" },
		},
	];
	expect(events.reduce(appendEvent, [] as MessagePart[])).toMatchObject([
		{ status: "error", exitCode: 7, result: "Exit code: 7" },
	]);
});

test("keeps reasoning, tool calls, and repeated text IDs in generation order", () => {
	const events: AgentStreamEvent[] = [
		{
			...base,
			type: "reasoning-delta",
			payload: { id: "r", text: "Inspect first." },
		},
		{ ...base, type: "reasoning-end", payload: { id: "r" } },
		{ ...base, type: "text-delta", payload: { id: "txt-0", text: "Before" } },
		{ ...base, type: "text-end", payload: { id: "txt-0" } },
		{
			...base,
			type: "tool-call-input-streaming-start",
			payload: { toolCallId: "a", toolName: "bash" },
		},
		{
			...base,
			type: "tool-call-delta",
			payload: { toolCallId: "a", argsTextDelta: '{"command":' },
		},
		{
			...base,
			type: "tool-call-delta",
			payload: { toolCallId: "a", argsTextDelta: '"pwd"}' },
		},
		{
			...base,
			type: "tool-call",
			payload: { toolCallId: "a", toolName: "bash", args: { command: "pwd" } },
		},
		{
			...base,
			type: "tool-call",
			payload: {
				toolCallId: "b",
				toolName: "read_file",
				args: { path: "absent" },
			},
		},
		{
			type: "data-sandbox-stdout",
			data: { toolCallId: "a", output: "/workspace\n" },
		},
		{
			...base,
			type: "tool-error",
			payload: {
				toolCallId: "b",
				toolName: "read_file",
				error: { message: "Not found" },
			},
		},
		{
			...base,
			type: "tool-result",
			payload: { toolCallId: "a", toolName: "bash", result: "/workspace\n" },
		},
		{ ...base, type: "text-start", payload: { id: "txt-0" } },
		{ ...base, type: "text-delta", payload: { id: "txt-0", text: "After" } },
	];
	const parts = events.reduce(appendEvent, [] as MessagePart[]);
	expect(parts).toMatchObject([
		{ kind: "reasoning", text: "Inspect first.", complete: true },
		{ kind: "text", text: "Before", complete: true },
		{
			kind: "tool",
			id: "a",
			status: "done",
			input: '{"command":"pwd"}',
			args: { command: "pwd" },
			output: "/workspace\n",
			result: "/workspace\n",
		},
		{
			kind: "tool",
			id: "b",
			status: "error",
			result: '{\n  "message": "Not found"\n}',
		},
		{ kind: "text", text: "After", complete: false },
	]);
});

test("marks unfinished tools interrupted, preserves explicit failed results", () => {
	const parts = [
		{
			...base,
			type: "tool-call",
			payload: { toolCallId: "a", toolName: "bash" },
		},
		{
			...base,
			type: "tool-result",
			payload: {
				toolCallId: "b",
				toolName: "read_file",
				result: "denied",
				isError: true,
			},
		},
	] satisfies AgentStreamEvent[];
	expect(
		completeParts(parts.reduce(appendEvent, [] as MessagePart[])),
	).toMatchObject([
		{ id: "a", status: "interrupted" },
		{ id: "b", status: "error", result: "denied" },
	]);
});
