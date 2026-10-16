"use client";

import { Box } from "@mui/material";
import { Suspense, lazy, useEffect, useRef, useState } from "react";

const HeroScene = lazy(() => import("./HeroScene"));

/** Same breakpoint as the two-column hero (MUI `md`). */
const WIDE_QUERY = "(min-width: 900px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Fades the scene out on the text side and at the bottom edge, onto the hero's own background. */
const SCENE_MASK = [
	"linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 35%, #000 58%)",
	"linear-gradient(180deg, #000 75%, transparent 100%)",
].join(", ");

const supportsWebGl = () => {
	try {
		const canvas = document.createElement("canvas");
		return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
	} catch {
		return false;
	}
};

const canShowHeroScene = () =>
	!!window.matchMedia?.(WIDE_QUERY).matches &&
	!window.matchMedia?.(REDUCED_MOTION_QUERY).matches &&
	supportsWebGl();

const useOnScreen = (element: React.RefObject<HTMLElement | null>) => {
	const [inView, setInView] = useState(true);
	const [tabVisible, setTabVisible] = useState(true);

	useEffect(() => {
		const target = element.current;
		if (!target || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(([entry]) =>
			setInView(entry.isIntersecting),
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [element]);

	useEffect(() => {
		const update = () => setTabVisible(document.visibilityState !== "hidden");
		document.addEventListener("visibilitychange", update);
		return () => document.removeEventListener("visibilitychange", update);
	}, []);

	return inView && tabVisible;
};

/**
 * Live 3D backdrop of the hero, covering its parent (which must be positioned). Renders nothing
 * when the scene can't or shouldn't run (narrow screen, reduced motion, no WebGL). Paused
 * off-screen and in hidden tabs.
 */
export default function HeroSceneSlot({ label }: { label: string }) {
	const container = useRef<HTMLDivElement>(null);
	// Unknown until mounted on the client; three.js is only fetched once this is `true`.
	const [live, setLive] = useState<boolean | null>(null);
	const onScreen = useOnScreen(container);

	useEffect(() => setLive(canShowHeroScene()), []);

	return (
		<Box
			ref={container}
			role={live ? "img" : undefined}
			aria-label={live ? label : undefined}
			sx={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				maskImage: SCENE_MASK,
				maskComposite: "intersect",
				WebkitMaskComposite: "source-in",
			}}
		>
			{live && (
				<Suspense fallback={null}>
					<HeroScene paused={!onScreen} />
				</Suspense>
			)}
		</Box>
	);
}
