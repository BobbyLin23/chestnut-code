import { TextAttributes } from "@opentui/core";
import {
	useKeyboard,
	useRenderer,
	useTerminalDimensions,
} from "@opentui/react";
import { useEffect, useMemo, useState } from "react";

import {
	type AgentResponse,
	checkServer,
	DEFAULT_MODEL,
	type RunAgent,
	runCodingAgent,
} from "./client";

const COLORS = {
	accent: "#c7f464",
	accentMuted: "#86a83d",
	assistant: "#d6ddff",
	background: "#292d3e",
	border: "#9aa5ce",
	danger: "#ff757f",
	dim: "#7982a9",
	panel: "#30354a",
	selected: "#444b6a",
	tool: "#ffc777",
	white: "#eef1ff",
} as const;

const COMMANDS = [
	{ name: "help", description: "Show keyboard shortcuts" },
	{ name: "clear", description: "Clear this conversation" },
	{ name: "new", description: "Start a new conversation" },
	{ name: "tools", description: "Show coding-agent tools" },
	{ name: "model", description: "Show the active model" },
	{ name: "quit", description: "Exit Chestnut Code" },
] as const;

const AVAILABLE_TOOLS = [
	"list_files",
	"read_file",
	"write_file",
	"edit_file",
	"grep",
	"bash",
] as const;

export type Message = {
	id: string;
	role: "user" | "assistant" | "notice";
	text: string;
	model?: string;
	toolCalls?: string[];
};

type Suggestion = {
	label: string;
	description: string;
	value: string;
};

export type AppProps = {
	files?: string[];
	runAgent?: RunAgent;
	initialInput?: string;
	initialMessages?: Message[];
	checkConnection?: () => Promise<boolean>;
};

function uniqueId() {
	return `${Date.now()}-${Math.random()}`;
}

function getMentionQuery(value: string) {
	return value.match(/(?:^|\s)@([^\s@]*)$/)?.[1] ?? null;
}

function getCommandQuery(value: string) {
	return value.match(/^\/([^\s]*)$/)?.[1] ?? null;
}

export function getSuggestions(value: string, files: string[]): Suggestion[] {
	const commandQuery = getCommandQuery(value);
	if (commandQuery !== null) {
		return COMMANDS.filter(({ name, description }) =>
			`${name} ${description}`
				.toLowerCase()
				.includes(commandQuery.toLowerCase()),
		).map(({ name, description }) => ({
			label: `/${name}`,
			description,
			value: `/${name} `,
		}));
	}

	const mentionQuery = getMentionQuery(value);
	if (mentionQuery !== null) {
		const normalized = mentionQuery.toLowerCase();
		return files
			.filter((path) => path.toLowerCase().includes(normalized))
			.slice(0, 8)
			.map((path) => ({
				label: `@${path}`,
				description: "workspace file",
				value: path,
			}));
	}

	return [];
}

function applySuggestion(input: string, suggestion: Suggestion) {
	if (suggestion.label.startsWith("/")) {
		return suggestion.value;
	}
	return input.replace(/@[^\s@]*$/, `@${suggestion.value} `);
}

function ToolTimeline({ toolCalls }: { toolCalls: string[] }) {
	if (toolCalls.length === 0) {
		return (
			<text fg={COLORS.dim}>
				<span fg={COLORS.accentMuted}>◇</span> Reasoning & actions · answered
				directly
			</text>
		);
	}
	const entries = toolCalls.map((tool, index) => ({
		id: `${tool}-${toolCalls.slice(0, index).filter((name) => name === tool).length}`,
		tool,
	}));

	return (
		<box flexDirection="column" marginTop={1}>
			<text fg={COLORS.dim}>
				<span fg={COLORS.accent}>◆</span> Reasoning & actions
			</text>
			{entries.map(({ id, tool }) => (
				<text key={id} fg={COLORS.dim}>
					<span fg={COLORS.tool}>✓ {tool}</span>
				</text>
			))}
		</box>
	);
}

function MessageView({ message }: { message: Message }) {
	if (message.role === "notice") {
		return (
			<box
				border={["left"]}
				borderColor={COLORS.tool}
				paddingLeft={1}
				marginBottom={1}
			>
				<text fg={COLORS.tool}>{message.text}</text>
			</box>
		);
	}

	const assistant = message.role === "assistant";
	return (
		<box flexDirection="column" marginBottom={1}>
			<text fg={assistant ? COLORS.accent : COLORS.dim}>
				<strong>{assistant ? "Chestnut" : "You"}</strong>
				{assistant && message.model ? `  ${message.model}` : ""}
			</text>
			<box
				backgroundColor={assistant ? COLORS.panel : COLORS.selected}
				paddingX={1}
				paddingY={assistant ? 1 : 0}
			>
				<text fg={assistant ? COLORS.assistant : COLORS.white} selectable>
					{message.text}
				</text>
			</box>
			{assistant ? <ToolTimeline toolCalls={message.toolCalls ?? []} /> : null}
		</box>
	);
}

function SuggestionMenu({
	suggestions,
	selected,
	mode,
}: {
	suggestions: Suggestion[];
	selected: number;
	mode: "commands" | "files";
}) {
	return (
		<box
			border
			height={suggestions.length + 2}
			flexShrink={0}
			borderStyle="rounded"
			borderColor={COLORS.border}
			title={mode === "commands" ? " Commands " : " Mention a file "}
			titleColor={COLORS.tool}
			flexDirection="column"
			paddingX={1}
		>
			{suggestions.map((suggestion, index) => (
				<box
					key={suggestion.label}
					height={1}
					flexShrink={0}
					backgroundColor={index === selected ? COLORS.tool : COLORS.background}
					paddingX={1}
				>
					<text fg={index === selected ? COLORS.background : COLORS.assistant}>
						<strong>{suggestion.label}</strong>
						<span fg={index === selected ? COLORS.selected : COLORS.dim}>
							{"  "}
							{suggestion.description}
						</span>
					</text>
				</box>
			))}
		</box>
	);
}

function Welcome() {
	return (
		<box
			flexGrow={1}
			alignItems="center"
			justifyContent="center"
			flexDirection="column"
		>
			<box height={4} flexShrink={0}>
				<ascii-font font="tiny" text="CHESTNUT" color={COLORS.accent} />
			</box>
			<text fg={COLORS.accent}>
				<strong>Code with an agent in your terminal</strong>
			</text>
			<text fg={COLORS.dim}>Ask a question or delegate a coding task.</text>
			<box marginTop={1} flexDirection="column">
				<text fg={COLORS.dim}>
					<span fg={COLORS.assistant}>/</span> commands{" "}
					<span fg={COLORS.assistant}>@</span> files
				</text>
				<text fg={COLORS.dim}>
					Enter send · ↑↓ choose · Esc close · Ctrl+C quit
				</text>
			</box>
		</box>
	);
}

export function App({
	files = [],
	runAgent = runCodingAgent,
	initialInput = "",
	initialMessages = [],
	checkConnection = checkServer,
}: AppProps) {
	const renderer = useRenderer();
	const { width } = useTerminalDimensions();
	const [input, setInput] = useState(initialInput);
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState(0);
	const [dismissedValue, setDismissedValue] = useState<string | null>(null);
	const [serverOnline, setServerOnline] = useState<boolean | null>(null);
	const [progress, setProgress] = useState(0);

	const suggestions = useMemo(
		() => getSuggestions(input, files),
		[files, input],
	);
	const menuOpen = suggestions.length > 0 && dismissedValue !== input;
	const menuMode = getCommandQuery(input) !== null ? "commands" : "files";
	const contentWidth = Math.min(Math.max(width - 4, 1), 110);

	useEffect(() => {
		void checkConnection().then(setServerOnline);
	}, [checkConnection]);

	useEffect(() => {
		if (!pending) {
			setProgress(0);
			return;
		}
		const timer = setInterval(
			() => setProgress((value) => (value + 1) % 3),
			900,
		);
		return () => clearInterval(timer);
	}, [pending]);

	function addNotice(text: string) {
		setMessages((current) => [
			...current,
			{ id: uniqueId(), role: "notice", text },
		]);
	}

	function runCommand(command: string) {
		switch (command) {
			case "clear":
			case "new":
				setMessages([]);
				break;
			case "help":
				addNotice(
					"/ commands · @ files · Enter send · ↑↓ choose · Esc close · Ctrl+C quit",
				);
				break;
			case "tools":
				addNotice(`Tools: ${AVAILABLE_TOOLS.join(" · ")}`);
				break;
			case "model":
				addNotice(`Active model: ${DEFAULT_MODEL}`);
				break;
			case "quit":
				renderer.destroy();
				break;
			default:
				setError(`Unknown command: /${command}. Type / to see commands.`);
		}
	}

	async function submit(value: string) {
		const message = value.trim();
		if (!message || pending) {
			return;
		}
		if (message.startsWith("/")) {
			runCommand(message.slice(1).trim().split(/\s+/)[0] ?? "");
			setInput("");
			return;
		}

		setInput("");
		setError(null);
		setPending(true);
		setMessages((current) => [
			...current,
			{ id: uniqueId(), role: "user", text: message },
		]);
		try {
			const response: AgentResponse = await runAgent(message);
			setMessages((current) => [
				...current,
				{
					id: uniqueId(),
					role: "assistant",
					text: response.text,
					model: response.model,
					toolCalls: response.toolCalls,
				},
			]);
			setServerOnline(true);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "The agent request failed.",
			);
			setServerOnline(false);
		} finally {
			setPending(false);
		}
	}

	function chooseSuggestion() {
		const suggestion = suggestions[selected];
		if (!suggestion) {
			return;
		}
		setInput((current) => applySuggestion(current, suggestion));
		setDismissedValue(null);
		setSelected(0);
	}

	useKeyboard((key) => {
		if (key.ctrl && key.name === "c") {
			key.preventDefault();
			renderer.destroy();
			return;
		}
		if (!menuOpen) {
			return;
		}
		if (key.name === "up" || key.name === "down") {
			key.preventDefault();
			setSelected((current) => {
				const direction = key.name === "up" ? -1 : 1;
				return (current + direction + suggestions.length) % suggestions.length;
			});
		}
		if (key.name === "enter" || key.name === "return" || key.name === "tab") {
			key.preventDefault();
			chooseSuggestion();
		}
		if (key.name === "escape") {
			key.preventDefault();
			setDismissedValue(input);
		}
	});

	return (
		<box
			width="100%"
			height="100%"
			backgroundColor={COLORS.background}
			alignItems="center"
			flexDirection="column"
		>
			<box
				width={contentWidth}
				height="100%"
				flexDirection="column"
				paddingY={1}
			>
				<box height={2} flexDirection="row" justifyContent="space-between">
					<text fg={COLORS.accent}>
						<strong>◆ CHESTNUT CODE</strong>
					</text>
					<text fg={serverOnline === false ? COLORS.danger : COLORS.dim}>
						{serverOnline === null
							? "◌ connecting"
							: serverOnline
								? "● online"
								: "○ offline"}
						{"  "}
						<span fg={COLORS.assistant}>{DEFAULT_MODEL}</span>
					</text>
				</box>

				<box
					border={["top"]}
					borderColor={COLORS.selected}
					flexGrow={1}
					paddingTop={1}
				>
					{messages.length === 0 && !pending ? (
						<Welcome />
					) : (
						<scrollbox height="100%" stickyScroll stickyStart="bottom">
							{messages.map((message) => (
								<MessageView key={message.id} message={message} />
							))}
							{pending ? (
								<box flexDirection="column" marginBottom={1}>
									<text fg={COLORS.accent}>
										<strong>Chestnut</strong> {DEFAULT_MODEL}
									</text>
									<text fg={COLORS.dim}>
										<span fg={COLORS.accent}>{["◐", "◓", "◑"][progress]}</span>{" "}
										{
											[
												"Understanding the request…",
												"Inspecting the workspace…",
												"Planning edits and checks…",
											][progress]
										}
									</text>
								</box>
							) : null}
						</scrollbox>
					)}
				</box>

				{error ? (
					<text fg={COLORS.danger} attributes={TextAttributes.DIM}>
						! {error}
					</text>
				) : null}
				{menuOpen ? (
					<SuggestionMenu
						suggestions={suggestions}
						selected={selected}
						mode={menuMode}
					/>
				) : null}
				<box
					border
					height={3}
					flexShrink={0}
					borderStyle="rounded"
					borderColor={pending ? COLORS.selected : COLORS.border}
					title=" Message "
					titleColor={COLORS.assistant}
					bottomTitle={pending ? " Agent is working " : " Enter to send "}
					bottomTitleAlignment="right"
					paddingX={1}
				>
					<text fg={COLORS.accent}>› </text>
					<input
						value={input}
						onChange={(value) => {
							setInput(value);
							setDismissedValue(null);
							setSelected(0);
						}}
						onSubmit={(value) =>
							void submit(typeof value === "string" ? value : input)
						}
						placeholder={
							pending
								? "Waiting for the agent…"
								: "Ask anything, / for commands, @ for files"
						}
						placeholderColor={COLORS.dim}
						textColor={COLORS.white}
						cursorColor={COLORS.accent}
						backgroundColor={COLORS.background}
						focusedBackgroundColor={COLORS.background}
						focused={!pending}
						maxLength={4000}
						flexGrow={1}
					/>
				</box>
				<box height={1} flexDirection="row" justifyContent="space-between">
					<text fg={COLORS.dim}>/ commands @ files</text>
					<text fg={COLORS.dim}>{input.length}/4000</text>
				</box>
			</box>
		</box>
	);
}
