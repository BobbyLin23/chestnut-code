import { realpath, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
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
	let workspacePath: string | undefined;
	try {
		const body = (await c.req.json()) as {
			message?: unknown;
			workspacePath?: unknown;
		};
		message = typeof body.message === "string" ? body.message.trim() : "";
		if (body.workspacePath !== undefined) {
			if (
				typeof body.workspacePath !== "string" ||
				body.workspacePath.length > 4096 ||
				!isAbsolute(body.workspacePath)
			) {
				return c.json({ error: "workspacePath must be an absolute path" }, 400);
			}
			workspacePath = await realpath(body.workspacePath);
			if (!(await stat(workspacePath)).isDirectory()) {
				return c.json({ error: "workspacePath must be a directory" }, 400);
			}
		}
	} catch {
		return c.json({ error: "Invalid JSON body or workspacePath" }, 400);
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
			await streamCodingAgentRun(message, send, abort.signal, workspacePath);
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
