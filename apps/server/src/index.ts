import type { AgentStreamEvent } from "@chestnut-code/api/agent-stream";
import { appRouter } from "@chestnut-code/api/routers/index";
import { trpcServer } from "@hono/trpc-server";
import {
	type HonoBindings,
	type HonoVariables,
	MastraServer,
} from "@mastra/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";

import { streamCodingAgentRun } from "./agent-stream";
import { createContext } from "./context";
import { desktopOrigins, env } from "./env.server";
import { mastra } from "./mastra";

const app = new Hono<{
	Bindings: HonoBindings;
	Variables: HonoVariables;
}>();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: [env.CORS_ORIGIN, ...desktopOrigins],
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);

const mastraServer = new MastraServer({ app, mastra });
await mastraServer.init();

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

app.post("/agent/stream", async (c) => {
	let message = "";
	try {
		const body = (await c.req.json()) as { message?: unknown };
		message = typeof body.message === "string" ? body.message.trim() : "";
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}
	if (!message || message.length > 4000) {
		return c.json({ error: "message must be 1-4000 characters" }, 400);
	}

	return streamSSE(c, async (stream) => {
		const abort = new AbortController();
		stream.onAbort(() => abort.abort());
		const send = async (chunk: AgentStreamEvent) => {
			await stream.writeSSE({
				data: JSON.stringify(chunk, (_key, value) =>
					value instanceof Error
						? { ...value, name: value.name, message: value.message }
						: value,
				),
			});
		};
		try {
			await streamCodingAgentRun(message, send, abort.signal);
		} catch (cause) {
			if (!abort.signal.aborted)
				await send({
					type: "transport-error",
					payload: {
						error:
							cause instanceof Error ? cause.message : "Agent stream failed.",
					},
				});
		}
	});
});

export default {
	port: 3150,
	fetch: app.fetch,
};
