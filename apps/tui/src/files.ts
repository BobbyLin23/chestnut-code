import { resolve } from "node:path";

const IGNORED_PREFIXES = [".agents/skills/"];
const MAX_PROMPT_LENGTH = 4000;

export function loadWorkspace() {
	const root = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
		cwd: process.cwd(),
	});
	if (root.exitCode !== 0) {
		return { files: [], rootPath: process.cwd() };
	}

	const rootPath = root.stdout.toString().trim();
	const files = Bun.spawnSync(
		["git", "ls-files", "--cached", "--others", "--exclude-standard"],
		{
			cwd: rootPath,
		},
	);
	if (files.exitCode !== 0) {
		return { files: [], rootPath };
	}

	const paths = files.stdout
		.toString()
		.split("\n")
		.filter(
			(path) =>
				path && !IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix)),
		)
		.sort();
	return { files: paths, rootPath };
}

export async function attachMentionedFiles(
	message: string,
	files: string[],
	rootPath: string,
) {
	const available = new Set(files);
	const mentioned = Array.from(
		message.matchAll(/@([^\s]+)/g),
		([, path]) => path,
	).filter((path): path is string => Boolean(path && available.has(path)));
	if (mentioned.length === 0) {
		return message;
	}

	let prompt = `${message}\n\nReferenced workspace files:`;
	for (const path of mentioned) {
		const header = `\n\n--- ${path} ---\n`;
		const remaining = MAX_PROMPT_LENGTH - prompt.length - header.length;
		if (remaining <= 0) {
			break;
		}
		try {
			const content = await Bun.file(resolve(rootPath, path)).text();
			prompt += header + content.slice(0, remaining);
		} catch {
			prompt += `${header}[Unable to read file]`;
		}
	}

	return prompt.slice(0, MAX_PROMPT_LENGTH);
}
