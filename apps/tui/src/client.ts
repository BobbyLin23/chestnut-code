import type { AppRouter } from "@chestnut-code/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export type AgentResponse = {
	model: string;
	text: string;
	tools: readonly string[];
	toolCalls: string[];
};

export type RunAgent = (message: string) => Promise<AgentResponse>;

export function getServerUrl() {
	return (process.env.SERVER_URL ?? "http://localhost:3150").replace(/\/$/, "");
}

const client = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${getServerUrl()}/trpc`,
		}),
	],
});

export const runCodingAgent: RunAgent = (message) => {
	return client.runCodingAgent.mutate({ message });
};

export async function checkServer() {
	try {
		const response = await fetch(getServerUrl());
		return response.ok;
	} catch {
		return false;
	}
}
