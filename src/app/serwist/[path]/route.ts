import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";
import { PRECACHE_ASSET_GLOBS, pagePrecacheEntries } from "@/offline/precache";

function buildRevision(): string {
	const git = (...args: string[]) =>
		spawnSync("git", args, { encoding: "utf-8" }).stdout?.trim();
	return git("stash", "create") || git("rev-parse", "HEAD") || randomUUID();
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		swSrc: "src/offline/sw.ts",
		globPatterns: PRECACHE_ASSET_GLOBS,
		additionalPrecacheEntries: pagePrecacheEntries(buildRevision()),
		useNativeEsbuild: true,
		esbuildOptions: { target: "es2022" },
	});
