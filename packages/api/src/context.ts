export type Context = {
	auth: null;
	session: null;
	runCodingAgent: (input: { message: string }) => Promise<{
		model: string;
		text: string;
		tools: readonly string[];
		toolCalls: string[];
	}>;
};
