export type Message = {
	id: string;
	role: "user" | "assistant" | "notice";
	text: string;
	model?: string;
	toolCalls?: string[];
};

export type ToolActivity = {
	id: string;
	tool: string;
	args?: Record<string, unknown>;
	status: "running" | "done" | "error";
};
