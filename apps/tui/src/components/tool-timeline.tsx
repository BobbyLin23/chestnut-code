import { COLORS } from "../constants/color";

export function ToolTimeline({ toolCalls }: { toolCalls: string[] }) {
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
