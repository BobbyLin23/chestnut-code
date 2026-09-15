import { Button } from "@chestnut-code/ui/components/button";
import { Textarea } from "@chestnut-code/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());
	const chat = useMutation(trpc.chat.mutationOptions());
	const [message, setMessage] = useState("");

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const prompt = message.trim();

		if (!prompt) {
			return;
		}

		chat.mutate({ message: prompt });
	}

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck.isLoading
								? "Checking..."
								: healthCheck.data
									? "Connected"
									: "Disconnected"}
						</span>
					</div>
				</section>

				<section className="grid gap-4 rounded-lg border p-4">
					<div>
						<h2 className="font-medium">Chat with the agent</h2>
						<p className="text-muted-foreground text-sm">
							Messages travel from this web app to Mastra through tRPC.
						</p>
					</div>

					{chat.data ? (
						<div
							className="grid gap-2 rounded-lg bg-muted p-3"
							aria-live="polite"
						>
							<span className="font-medium text-xs">
								Agent · {chat.data.model}
							</span>
							<p className="whitespace-pre-wrap text-sm">{chat.data.text}</p>
						</div>
					) : null}

					<form className="grid gap-2" onSubmit={handleSubmit}>
						<label className="font-medium text-sm" htmlFor="chat-message">
							Message
						</label>
						<Textarea
							id="chat-message"
							name="message"
							placeholder="Ask the agent anything…"
							value={message}
							onChange={(event) => setMessage(event.target.value)}
							disabled={chat.isPending}
							maxLength={4000}
						/>
						<Button
							className="w-fit"
							type="submit"
							disabled={chat.isPending || !message.trim()}
						>
							{chat.isPending ? "Thinking…" : "Send message"}
						</Button>
					</form>
				</section>
			</div>
		</div>
	);
}
