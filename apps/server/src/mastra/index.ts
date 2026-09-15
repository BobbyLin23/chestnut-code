import { Mastra } from "@mastra/core";

import { chatAgent, DEFAULT_MODEL } from "./agents/chat-agent";

export const mastra = new Mastra({
	agents: { chatAgent },
});

export { DEFAULT_MODEL };
