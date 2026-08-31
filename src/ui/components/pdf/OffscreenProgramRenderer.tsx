"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { GrafcetContextProvider } from "@/ui/components/grafcet/context/GrafcetContext";
import GrafcetFlow from "@/ui/components/grafcet/flow/GrafcetFlow";
import { LadderContextProvider } from "@/ui/components/ladder/context/LadderContext";
import LadderFlow from "@/ui/components/ladder/flow/LadderFlow";
import { getFlowDimensions } from "@/ui/utils/grafcet/grafcet-utils";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

export type OffscreenProgram =
	{ type: "grafcet"; program: Grafcet } | { type: "ladder"; program: Ladder };

export interface OffscreenProgramRendererHandle {
	/** Retourne l'élément DOM racine du programme demandé, ou null s'il n'est pas monté. */
	getElement(programId: string): HTMLElement | null;
}

/**
 * Monte des programmes GRAFCET/Ladder dans un conteneur hors-écran (portail sur document.body)
 * avec une largeur fixe de 1200px. Chaque programme signale qu'il est prêt via `onProgramReady`.
 *
 * Le conteneur est placé hors du viewport (position absolute, `left: -9999px`) mais reste
 * peint et dimensionné : React Flow doit pouvoir calculer son layout, et la capture recopie
 * le style calculé sur son clone — un `visibility: hidden` ou `opacity: 0` ici produirait une
 * capture entièrement vide.
 */
const OffscreenProgramRenderer = forwardRef<
	OffscreenProgramRendererHandle,
	{
		programs: OffscreenProgram[];
		onProgramReady: (programId: string, element: HTMLElement) => void;
	}
>(({ programs, onProgramReady }, ref) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useImperativeHandle(ref, () => ({
		getElement(programId: string): HTMLElement | null {
			return (
				containerRef.current?.querySelector(
					`[data-offscreen-id="${programId}"]`,
				) ?? null
			);
		},
	}));

	if (!mounted || typeof document === "undefined") return null;

	return createPortal(
		<div
			ref={containerRef}
			style={{
				position: "absolute",
				left: -9999,
				top: 0,
				width: 1200,
				pointerEvents: "none",
				zIndex: -1,
			}}
		>
			{programs.map((entry) =>
				entry.type === "grafcet" ? (
					<OffscreenGrafcet
						key={entry.program.id}
						grafcet={entry.program}
						onReady={onProgramReady}
					/>
				) : (
					<OffscreenLadder
						key={entry.program.id}
						ladder={entry.program}
						onReady={onProgramReady}
					/>
				),
			)}
		</div>,
		document.body,
	);
});

OffscreenProgramRenderer.displayName = "OffscreenProgramRenderer";
export default OffscreenProgramRenderer;

// ---------------------------------------------------------------------------

function OffscreenGrafcet({
	grafcet,
	onReady,
}: {
	grafcet: Grafcet;
	onReady: (id: string, el: HTMLElement) => void;
}) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const readyFired = useRef(false);
	const dimensions = useMemo(
		() => getFlowDimensions(grafcet.format),
		[grafcet.format],
	);

	// Sonde l'apparition de l'instance React Flow (rfInstance) via rAF.
	// GrafcetFlow appelle viewManager.setReactFlowInstance dans onInit :
	// dès que l'élément .react-flow__viewport est présent dans le DOM, le rendu est terminé.
	// On capture le nœud `.react-flow` (dimensions exactes de la page) plutôt que le conteneur
	// éditeur, qui porte le fond gris, le padding et la scrollbar.
	useEffect(() => {
		let rafId: number;
		let attempts = 0;
		const MAX = 200; // ~3s à 60fps

		const poll = () => {
			if (readyFired.current) return;
			const viewport = wrapperRef.current?.querySelector(
				".react-flow__viewport",
			) as HTMLElement | null;
			if (viewport) {
				readyFired.current = true;
				const flow = wrapperRef.current?.querySelector(
					".react-flow",
				) as HTMLElement | null;
				onReady(grafcet.id, flow ?? wrapperRef.current!);
				return;
			}
			if (++attempts < MAX) rafId = requestAnimationFrame(poll);
		};

		rafId = requestAnimationFrame(poll);
		return () => cancelAnimationFrame(rafId);
	}, [grafcet.id, onReady]);

	return (
		<div
			ref={wrapperRef}
			data-offscreen-id={grafcet.id}
			style={{
				width: dimensions.width,
				height: dimensions.height,
				overflow: "hidden",
				background: "#fff",
			}}
		>
			<GrafcetContextProvider initialGrafcet={grafcet}>
				<GrafcetFlow />
			</GrafcetContextProvider>
		</div>
	);
}

function OffscreenLadder({
	ladder,
	onReady,
}: {
	ladder: Ladder;
	onReady: (id: string, el: HTMLElement) => void;
}) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const readyFired = useRef(false);

	useEffect(() => {
		let rafId: number;
		let attempts = 0;
		const MAX = 200;

		const poll = () => {
			if (readyFired.current) return;
			// LadderFlow utilise un ReactFlowProvider par section — on vérifie le premier viewport
			const viewport = wrapperRef.current?.querySelector(
				".react-flow__viewport",
			) as HTMLElement | null;
			if (viewport) {
				readyFired.current = true;
				// `.ladder-page` porte le fond gris et le padding de l'éditeur : on les neutralise
				// et on capture ce nœud, dimensionné au contenu (empilement des sections).
				const page = wrapperRef.current?.querySelector(
					".ladder-page",
				) as HTMLElement | null;
				if (page) {
					page.style.padding = "0";
					page.style.background = "#fff";
					page.style.overflow = "visible";
					page.style.width = "max-content";
				}
				onReady(ladder.id, page ?? wrapperRef.current!);
				return;
			}
			if (++attempts < MAX) rafId = requestAnimationFrame(poll);
		};

		rafId = requestAnimationFrame(poll);
		return () => cancelAnimationFrame(rafId);
	}, [ladder.id, onReady]);

	return (
		<div
			ref={wrapperRef}
			data-offscreen-id={ladder.id}
			style={{ width: "max-content", background: "#fff", overflow: "visible" }}
		>
			<LadderContextProvider initialLadder={ladder}>
				<LadderFlow />
			</LadderContextProvider>
		</div>
	);
}
