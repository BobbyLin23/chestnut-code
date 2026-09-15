import { Agent } from "@mastra/core/agent";

export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export const chatAgent = new Agent({
	id: "chat-agent",
	name: "Chestnut Chat Agent",
	instructions:
		"You are a helpful coding assistant. Answer clearly and concisely. Ask a focused follow-up question when the request is ambiguous.",
	model: DEFAULT_MODEL,
});
