import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export type GitRunner = (...args: string[]) => string | undefined;

const runGit: GitRunner = (...args) =>
	spawnSync("git", args, { encoding: "utf-8" }).stdout?.trim();

export default function buildRevision(git: GitRunner = runGit): string {
	return git("stash", "create") || git("rev-parse", "HEAD") || randomUUID();
}
