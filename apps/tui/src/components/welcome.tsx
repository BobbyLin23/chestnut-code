import { COLORS } from "../constants/color";

export function Welcome() {
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
