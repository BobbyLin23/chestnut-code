import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { App } from "./app";
import { streamCodingAgent } from "./client";
import { attachMentionedFiles, loadWorkspace } from "./files";

const renderer = await createCliRenderer({ exitOnCtrlC: false });
const workspace = loadWorkspace();

createRoot(renderer).render(
	<App
		files={workspace.files}
		runAgent={async (message, onEvent) =>
			streamCodingAgent(
				await attachMentionedFiles(
					message,
					workspace.files,
					workspace.rootPath,
				),
				onEvent,
			)
		}
	/>,
);
