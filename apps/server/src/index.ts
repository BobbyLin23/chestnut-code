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

export default {
	port: 3150,
	fetch: app.fetch,
};
