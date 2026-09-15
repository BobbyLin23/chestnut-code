import type { Context as ApiContext } from "@chestnut-code/api/context";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext(
	_options: CreateContextOptions,
): Promise<ApiContext> {
	return {
		auth: null,
		session: null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
