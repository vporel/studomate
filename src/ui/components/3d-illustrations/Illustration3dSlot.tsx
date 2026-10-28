"use client";

import { Box } from "@mui/material";
import {
	type ComponentType,
	type LazyExoticComponent,
	type ReactNode,
	Suspense,
	lazy,
	useEffect,
	useRef,
	useState,
} from "react";

type IllustrationComponent = LazyExoticComponent<
	ComponentType<{ paused: boolean }>
>;

const ILLUSTRATIONS = {
	"carton-sorting": lazy(
		() => import("./carton-sorting/CartonSortingIllustration"),
	),
	crossroads: lazy(() => import("./crossroads/CrossroadsIllustration")),
} satisfies Record<string, IllustrationComponent>;

export type Illustration3dId = keyof typeof ILLUSTRATIONS;

export const isIllustration3dId = (id: string): id is Illustration3dId =>
	Object.hasOwn(ILLUSTRATIONS, id);

/** Same breakpoint as the two-column layouts hosting the scene (MUI `md`). */
const WIDE_QUERY = "(min-width: 900px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const supportsWebGl = () => {
	try {
		const canvas = document.createElement("canvas");
		return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
	} catch {
		return false;
	}
};

const canShowIllustration = () =>
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
 * Live 3D backdrop covering its parent (which must be positioned). Renders `fallback`
 * (nothing by default) when the scene can't or shouldn't run (narrow screen, reduced motion,
 * no WebGL). Paused off-screen and in hidden tabs.
 */
export default function Illustration3dSlot({
	illustration,
	label,
	mask,
	fallback = null,
}: {
	illustration: Illustration3dId;
	label: string;
	/** CSS `mask-image` layers, intersected, fading the scene onto the host's background. */
	mask?: string;
	fallback?: ReactNode;
}) {
	const Illustration = ILLUSTRATIONS[illustration];
	const container = useRef<HTMLDivElement>(null);
	// Unknown until mounted on the client; three.js is only fetched once this is `true`.
	const [live, setLive] = useState<boolean | null>(null);
	const onScreen = useOnScreen(container);

	useEffect(() => setLive(canShowIllustration()), []);

	return (
		<Box
			ref={container}
			role={live ? "img" : undefined}
			aria-label={live ? label : undefined}
			sx={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				maskImage: mask,
				maskComposite: "intersect",
				WebkitMaskComposite: "source-in",
			}}
		>
			{live && (
				<Suspense fallback={null}>
					<Illustration paused={!onScreen} />
				</Suspense>
			)}
			{live === false && fallback}
		</Box>
	);
}
