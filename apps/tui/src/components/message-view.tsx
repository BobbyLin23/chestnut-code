import { COLORS } from "../constants/color";
import type { Message } from "../types";
import { ToolTimeline } from "./tool-timeline";

export function MessageView({ message }: { message: Message }) {
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
