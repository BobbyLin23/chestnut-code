import { Mastra } from "@mastra/core";

import {
	CODING_AGENT_TOOLS,
	codingAgent,
	DEFAULT_MODEL,
	getCodingAgent,
} from "./agents/coding-agent";

export const mastra = new Mastra({
	agents: { codingAgent },
});

export { CODING_AGENT_TOOLS, codingAgent, DEFAULT_MODEL, getCodingAgent };
