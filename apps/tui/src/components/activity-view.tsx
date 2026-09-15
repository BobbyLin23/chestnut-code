import { COLORS } from "../constants/color";
import type { ToolActivity } from "../types";

const SPINNER = ["◐", "◓", "◑"] as const;

const ARG_KEYS = [
	"path",
	"filePath",
	"pattern",
	"command",
	"query",
	"src",
] as const;

function summarizeArgs(args?: Record<string, unknown>): string {
	if (!args) {
		return "";
	}
	for (const key of ARG_KEYS) {
		const value = args[key];
		if (typeof value === "string" && value) {
			return value.length > 60 ? `${value.slice(0, 60)}…` : value;
		}
	}
	const entry = Object.entries(args)[0];
	if (entry && typeof entry[1] === "string") {
		return entry[1].length > 60 ? `${entry[1].slice(0, 60)}…` : entry[1];
	}
	return "";
}

export function ActivityView({
	activity,
	streamText,
	progress,
}: {
	activity: ToolActivity[];
	streamText: string;
	progress: number;
}) {
	return (
		<box flexDirection="column" marginBottom={1}>
			{activity.length === 0 && !streamText ? (
				<text fg={COLORS.dim}>
					<span fg={COLORS.accent}>◐</span> Agent is working…
				</text>
			) : null}
			{activity.map((item) => (
				<text
					key={item.id}
					fg={item.status === "error" ? COLORS.danger : COLORS.dim}
				>
					{item.status === "running" ? (
						<span fg={COLORS.accent}>{SPINNER[progress]}</span>
					) : item.status === "done" ? (
						<span fg={COLORS.tool}>✓</span>
					) : (
						<span fg={COLORS.danger}>✗</span>
					)}
					{"  "}
					<strong>{item.tool}</strong>
					{summarizeArgs(item.args) ? ` ${summarizeArgs(item.args)}` : ""}
				</text>
			))}
			{streamText ? (
				<box backgroundColor={COLORS.panel} paddingX={1} paddingY={1}>
					<text fg={COLORS.assistant} selectable>
						{streamText}
					</text>
				</box>
			) : null}
		</box>
	);
}
