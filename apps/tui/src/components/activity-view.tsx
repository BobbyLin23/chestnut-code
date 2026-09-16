import { COLORS } from "../constants/color";
import { formatOutput } from "../transcript";
import type { MessagePart } from "../types";

const SPINNER = ["◐", "◓", "◑"] as const;

/** The same transcript is rendered during streaming and after completion. */
export function ActivityView({
	parts,
	progress = 0,
}: {
	parts: MessagePart[];
	progress?: number;
}) {
	return (
		<box flexDirection="column" flexShrink={0} marginBottom={1}>
			{parts.length === 0 ? (
				<text fg={COLORS.dim}>◐ Agent is working…</text>
			) : null}
			{parts.map((part, index) => {
				if (part.kind !== "tool")
					return (
						<box
							// biome-ignore lint/suspicious/noArrayIndexKey: Transcript blocks are append-only; provider IDs repeat across steps.
							key={`${index}-${part.id}`}
							flexDirection="column"
							flexShrink={0}
							marginBottom={1}
							{...(part.kind === "reasoning"
								? { border: ["left"] as ["left"], borderColor: COLORS.border }
								: {})}
							paddingX={1}
							backgroundColor={part.kind === "text" ? COLORS.panel : undefined}
						>
							{part.kind === "reasoning" ? (
								<text fg={COLORS.accentMuted}>
									<em>{part.complete ? "Reasoning" : "Thinking…"}</em>
								</text>
							) : null}
							<text
								fg={part.kind === "reasoning" ? COLORS.dim : COLORS.assistant}
								selectable
							>
								{part.text}
							</text>
						</box>
					);
				const failed = part.status === "error" || part.status === "interrupted";
				const icon =
					part.status === "done" ? "✓" : failed ? "✗" : SPINNER[progress];
				const output =
					part.result === undefined || part.result === part.output
						? part.output || part.result
						: [part.output, part.result].filter(Boolean).join("\n");
				return (
					<box
						key={`tool-${part.id}`}
						flexDirection="column"
						flexShrink={0}
						marginBottom={1}
						paddingX={1}
					>
						<text fg={failed ? COLORS.danger : COLORS.tool}>
							<strong>
								{icon} {part.tool}
							</strong>
							<span fg={COLORS.dim}>
								{" "}
								· {part.status === "input" ? "preparing" : part.status}
								{part.exitCode !== undefined ? ` · exit ${part.exitCode}` : ""}
							</span>
						</text>
						<text fg={COLORS.dim} selectable>
							{part.args === undefined ? part.input : formatOutput(part.args)}
						</text>
						{output ? (
							<box
								border={["left"]}
								borderColor={failed ? COLORS.danger : COLORS.border}
								paddingLeft={1}
								flexShrink={0}
							>
								<text fg={failed ? COLORS.danger : COLORS.assistant} selectable>
									{output}
								</text>
							</box>
						) : null}
					</box>
				);
			})}
		</box>
	);
}
