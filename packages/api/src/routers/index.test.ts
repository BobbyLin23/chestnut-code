import { describe, expect, test } from "bun:test";

import { appRouter } from "./index";

describe("coding agent procedure", () => {
	test("validates and forwards a trimmed message to the agent", async () => {
		const messages: string[] = [];
		const caller = appRouter.createCaller({
			auth: null,
			session: null,
			runCodingAgent: async ({ message }) => {
				messages.push(message);
				return {
					model: "test/model",
					text: `Reply to: ${message}`,
					tools: ["read_file", "edit_file"],
					toolCalls: ["read_file"],
				};
			},
		});

		await expect(
			caller.runCodingAgent({ message: "  Hello agent  " }),
		).resolves.toEqual({
			model: "test/model",
			text: "Reply to: Hello agent",
			tools: ["read_file", "edit_file"],
			toolCalls: ["read_file"],
		});
		expect(messages).toEqual(["Hello agent"]);
	});

	test("rejects an empty message", async () => {
		const caller = appRouter.createCaller({
			auth: null,
			session: null,
			runCodingAgent: async () => ({
				model: "test/model",
				text: "unused",
				tools: [],
				toolCalls: [],
			}),
		});

		await expect(
			caller.runCodingAgent({ message: "   " }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});
