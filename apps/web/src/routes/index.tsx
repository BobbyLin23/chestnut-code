import { Bubble, BubbleContent } from "@chestnut-code/ui/components/bubble";
import { Button } from "@chestnut-code/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@chestnut-code/ui/components/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@chestnut-code/ui/components/input-group";
import {
	Message,
	MessageContent,
	MessageFooter,
	MessageHeader,
} from "@chestnut-code/ui/components/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@chestnut-code/ui/components/message-scroller";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	BotIcon,
	CheckCircle2Icon,
	CircleIcon,
	Code2Icon,
	FilePenLineIcon,
	FilesIcon,
	FolderSearch2Icon,
	LoaderCircleIcon,
	SearchIcon,
	SendIcon,
	SquareTerminalIcon,
} from "lucide-react";
import { useState } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TOOLS = [
	{ name: "list_files", description: "Explore folders", icon: FilesIcon },
	{ name: "read_file", description: "Read source files", icon: Code2Icon },
	{ name: "write_file", description: "Create files", icon: FilePenLineIcon },
	{
		name: "edit_file",
		description: "Make precise edits",
		icon: FilePenLineIcon,
	},
	{ name: "grep", description: "Search code", icon: SearchIcon },
	{ name: "bash", description: "Run checks", icon: SquareTerminalIcon },
] as const;

const EXAMPLE_PROMPTS = [
	"Create a small TypeScript hello-world app and test it.",
	"List the files in the workspace and explain what you find.",
	"Find every TODO, fix the simplest one, and verify the change.",
] as const;

type ChatMessage = {
	id: string;
	role: "user" | "agent";
	text: string;
	model?: string;
	toolCalls?: string[];
};

function HomeComponent() {
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());
	const runAgent = useMutation(trpc.runCodingAgent.mutationOptions());
	const [prompt, setPrompt] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [error, setError] = useState<string | null>(null);

	async function submitPrompt(nextPrompt: string) {
		const message = nextPrompt.trim();
		if (!message || runAgent.isPending) {
			return;
		}

		setError(null);
		setPrompt("");
		setMessages((current) => [
			...current,
			{ id: crypto.randomUUID(), role: "user", text: message },
		]);

		try {
			const response = await runAgent.mutateAsync({ message });
			setMessages((current) => [
				...current,
				{
					id: crypto.randomUUID(),
					role: "agent",
					text: response.text,
					model: response.model,
					toolCalls: response.toolCalls,
				},
			]);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "The agent request failed.",
			);
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void submitPrompt(prompt);
	}

	return (
		<main className="min-h-svh bg-muted/30 p-3 sm:p-6 lg:h-svh lg:overflow-hidden">
			<div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-7xl flex-col gap-3 sm:min-h-[calc(100svh-3rem)] lg:h-[calc(100svh-3rem)] lg:min-h-0">
				<header className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center bg-foreground text-background">
							<Code2Icon className="size-5" aria-hidden="true" />
						</div>
						<div>
							<h1 className="font-semibold text-sm">Chestnut Code</h1>
							<p className="text-muted-foreground text-xs">
								Mastra coding agent playground
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div className="hidden items-center gap-2 text-muted-foreground text-xs sm:flex">
							{healthCheck.data ? (
								<CheckCircle2Icon className="size-4 text-foreground" />
							) : (
								<CircleIcon className="size-4" />
							)}
							{healthCheck.isLoading
								? "Connecting"
								: healthCheck.data
									? "Server ready"
									: "Server offline"}
						</div>
						<ModeToggle />
					</div>
				</header>

				<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[17rem_1fr] lg:overflow-hidden">
					<aside className="hidden min-h-0 flex-col gap-3 lg:flex">
						<Card>
							<CardHeader>
								<CardTitle>Agent setup</CardTitle>
								<CardDescription>
									DeepSeek V4 Flash with a focused local toolset.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-1">
								{TOOLS.map(({ name, description, icon: Icon }) => (
									<div key={name} className="flex items-center gap-2 py-1.5">
										<Icon
											className="size-4 text-muted-foreground"
											aria-hidden="true"
										/>
										<div className="min-w-0">
											<p className="font-mono text-xs">{name}</p>
											<p className="text-muted-foreground text-xs">
												{description}
											</p>
										</div>
									</div>
								))}
							</CardContent>
						</Card>

						<Card className="mt-auto">
							<CardHeader>
								<CardTitle>Workspace</CardTitle>
								<CardDescription>
									Files are kept in a dedicated local directory and persist
									between runs.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<code className="text-muted-foreground text-xs">
									.coding-agent-workspace/
								</code>
							</CardContent>
						</Card>
					</aside>

					<Card className="min-h-[70svh] py-0 lg:min-h-0">
						<CardHeader className="border-b py-4">
							<CardTitle className="flex items-center gap-2">
								<BotIcon className="size-4" aria-hidden="true" />
								Coding agent
							</CardTitle>
							<CardDescription>
								Ask it to inspect, create, edit, and test code in its workspace.
							</CardDescription>
						</CardHeader>

						<CardContent className="flex min-h-0 flex-1 flex-col px-0">
							<MessageScrollerProvider>
								<MessageScroller>
									<MessageScrollerViewport>
										<MessageScrollerContent className="p-4 sm:p-6">
											{messages.length === 0 ? (
												<div className="m-auto flex max-w-lg flex-col items-center gap-5 py-12 text-center">
													<div className="flex size-12 items-center justify-center border bg-background">
														<FolderSearch2Icon
															className="size-5"
															aria-hidden="true"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<h2 className="font-medium text-base">
															What should we build?
														</h2>
														<p className="text-muted-foreground text-sm">
															Try a complete task so the agent can inspect,
															edit, and verify.
														</p>
													</div>
													<div className="flex w-full flex-col gap-2">
														{EXAMPLE_PROMPTS.map((example) => (
															<Button
																key={example}
																variant="outline"
																className="h-auto justify-start whitespace-normal py-2 text-left"
																onClick={() => void submitPrompt(example)}
															>
																{example}
															</Button>
														))}
													</div>
												</div>
											) : (
												messages.map((message) => (
													<MessageScrollerItem key={message.id}>
														<Message
															align={message.role === "user" ? "end" : "start"}
														>
															<MessageContent>
																<MessageHeader>
																	{message.role === "user" ? "You" : "Chestnut"}
																</MessageHeader>
																<Bubble
																	align={
																		message.role === "user" ? "end" : "start"
																	}
																	variant={
																		message.role === "user"
																			? "default"
																			: "muted"
																	}
																>
																	<BubbleContent className="whitespace-pre-wrap text-sm">
																		{message.text}
																	</BubbleContent>
																</Bubble>
																{message.toolCalls?.length ? (
																	<MessageFooter>
																		Used {message.toolCalls.join(" · ")}
																	</MessageFooter>
																) : null}
															</MessageContent>
														</Message>
													</MessageScrollerItem>
												))
											)}
											{runAgent.isPending ? (
												<MessageScrollerItem scrollAnchor>
													<Message>
														<MessageContent>
															<MessageHeader>Chestnut</MessageHeader>
															<Bubble variant="muted">
																<BubbleContent className="flex items-center gap-2 text-sm">
																	<LoaderCircleIcon className="size-4 animate-spin" />
																	Inspecting the workspace…
																</BubbleContent>
															</Bubble>
														</MessageContent>
													</Message>
												</MessageScrollerItem>
											) : null}
										</MessageScrollerContent>
									</MessageScrollerViewport>
									<MessageScrollerButton />
								</MessageScroller>
							</MessageScrollerProvider>
						</CardContent>

						<div className="border-t p-3 sm:p-4">
							{error ? (
								<p className="mb-2 text-destructive text-xs" role="alert">
									{error}
								</p>
							) : null}
							<form onSubmit={handleSubmit}>
								<InputGroup>
									<InputGroupTextarea
										aria-label="Coding task"
										placeholder="Describe a coding task…"
										value={prompt}
										onChange={(event) => setPrompt(event.target.value)}
										disabled={runAgent.isPending}
										maxLength={4000}
										rows={3}
										onKeyDown={(event) => {
											if (event.key === "Enter" && !event.shiftKey) {
												event.preventDefault();
												void submitPrompt(prompt);
											}
										}}
									/>
									<InputGroupAddon
										align="block-end"
										className="justify-between"
									>
										<span>Enter to send · Shift + Enter for a new line</span>
										<InputGroupButton
											type="submit"
											variant="default"
											size="icon-sm"
											disabled={runAgent.isPending || !prompt.trim()}
											aria-label="Send task"
										>
											{runAgent.isPending ? (
												<LoaderCircleIcon className="animate-spin" />
											) : (
												<SendIcon />
											)}
										</InputGroupButton>
									</InputGroupAddon>
								</InputGroup>
							</form>
						</div>
					</Card>
				</div>
			</div>
		</main>
	);
}
