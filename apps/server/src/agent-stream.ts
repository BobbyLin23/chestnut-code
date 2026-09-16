import type { AgentStreamEvent } from "@chestnut-code/api/agent-stream";
import { getCodingAgent } from "./mastra";

export async function streamCodingAgentRun(
	message: string,
	send: (chunk: AgentStreamEvent) => Promise<void>,
	abortSignal: AbortSignal,
	workspacePath?: string,
) {
	const codingAgent = await getCodingAgent(workspacePath);
	const result = await codingAgent.stream(message, {
		maxSteps: 10,
		abortSignal,
	});
	for await (const chunk of result.fullStream) {
		if (abortSignal.aborted) break;
		await send(chunk);
	}
}
