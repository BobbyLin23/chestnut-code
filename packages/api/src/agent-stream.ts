import type {
	ChunkType,
	DataChunkType,
	ToolCallPayload,
} from "@mastra/core/stream";

// Arguments depend on the tool schema, not Mastra's internal metadata shape.
type CodingChunk =
	| Exclude<ChunkType, { type: "tool-call" }>
	| (Omit<Extract<ChunkType, { type: "tool-call" }>, "payload"> & {
			payload: Omit<ToolCallPayload, "args"> & { args?: unknown };
	  });

// On the wire, Mastra's source enum is a string literal, not a runtime enum.
type WireChunk<T> = T extends { from: infer From extends string }
	? Omit<T, "from"> & { from: `${From}` }
	: T;

/** Each SSE data field contains a JSON-serialized Mastra fullStream chunk.
 * Data chunks (e.g. sandbox stdout) do not carry runId/from.
 * transport-error is reserved for failures outside Mastra's stream.
 */
export type AgentStreamEvent =
	| WireChunk<CodingChunk>
	| DataChunkType
	| { type: "transport-error"; payload: { error: string } };
