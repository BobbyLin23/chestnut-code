import type { Context as ApiContext } from "@chestnut-code/api/context";
import type { Context as HonoContext } from "hono";

import { CODING_AGENT_TOOLS, DEFAULT_MODEL, mastra } from "./mastra";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext(
	_options: CreateContextOptions,
): Promise<ApiContext> {
	return {
		auth: null,
		session: null,
		runCodingAgent: async ({ message }) => {
			const agent = mastra.getAgentById("coding-agent");
			const response = await agent.generate(message, { maxSteps: 10 });

			return {
				model: DEFAULT_MODEL,
				text: response.text,
				tools: CODING_AGENT_TOOLS,
				toolCalls: response.toolCalls.map(({ payload }) => payload.toolName),
			};
		},
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
