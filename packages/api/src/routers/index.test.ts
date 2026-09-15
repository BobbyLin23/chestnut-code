import { describe, expect, test } from "bun:test";

import { appRouter } from "./index";

describe("chat procedure", () => {
	test("validates and forwards a trimmed message to the agent", async () => {
		const messages: string[] = [];
		const caller = appRouter.createCaller({
			auth: null,
			session: null,
			chatWithAgent: async ({ message }) => {
				messages.push(message);
				return {
					model: "test/model",
					text: `Reply to: ${message}`,
				};
			},
		});

		await expect(caller.chat({ message: "  Hello agent  " })).resolves.toEqual({
			model: "test/model",
			text: "Reply to: Hello agent",
		});
		expect(messages).toEqual(["Hello agent"]);
	});

	test("rejects an empty message", async () => {
		const caller = appRouter.createCaller({
			auth: null,
			session: null,
			chatWithAgent: async () => ({ model: "test/model", text: "unused" }),
		});

		await expect(caller.chat({ message: "   " })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});
});
