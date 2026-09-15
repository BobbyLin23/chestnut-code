import { z } from "zod";

import { publicProcedure, router } from "../index";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	chat: publicProcedure
		.input(
			z.object({
				message: z.string().trim().min(1).max(4000),
			}),
		)
		.mutation(({ ctx, input }) => {
			return ctx.chatWithAgent(input);
		}),
});
export type AppRouter = typeof appRouter;
