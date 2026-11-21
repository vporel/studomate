import { createSerwistRoute } from "@serwist/turbopack";
import buildRevision from "@/offline/build-revision";
import { PRECACHE_ASSET_GLOBS, pagePrecacheEntries } from "@/offline/precache";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		swSrc: "src/offline/sw.ts",
		globPatterns: PRECACHE_ASSET_GLOBS,
		additionalPrecacheEntries: pagePrecacheEntries(buildRevision()),
		useNativeEsbuild: true,
		esbuildOptions: { target: "es2022" },
	});
