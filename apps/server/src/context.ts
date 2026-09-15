import type { Context as ApiContext } from "@chestnut-code/api/context";
import type { Context as HonoContext } from "hono";

import { DEFAULT_MODEL, mastra } from "./mastra";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext(
	_options: CreateContextOptions,
): Promise<ApiContext> {
	return {
		auth: null,
		session: null,
		chatWithAgent: async ({ message }) => {
			const agent = mastra.getAgentById("chat-agent");
			const response = await agent.generate(message);

			return {
				model: DEFAULT_MODEL,
				text: response.text,
			};
		},
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
