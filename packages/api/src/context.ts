export type Context = {
	auth: null;
	session: null;
	chatWithAgent: (input: { message: string }) => Promise<{
		model: string;
		text: string;
	}>;
};
