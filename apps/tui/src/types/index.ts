export type Message = {
	id: string;
	role: "user" | "assistant" | "notice";
	text: string;
	model?: string;
	toolCalls?: string[];
	parts?: MessagePart[];
};

export type MessagePart =
	| {
			kind: "text" | "reasoning";
			id: string;
			text: string;
			complete: boolean;
	  }
	| {
			kind: "tool";
			id: string;
			tool: string;
			args?: unknown;
			input: string;
			output: string;
			result?: string;
			exitCode?: number;
			status: "input" | "running" | "done" | "error" | "interrupted";
	  };
