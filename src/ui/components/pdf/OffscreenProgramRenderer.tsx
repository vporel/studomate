"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { GrafcetContextProvider } from "@/ui/components/grafcet/context/GrafcetContext";
import GrafcetFlow from "@/ui/components/grafcet/flow/GrafcetFlow";
import { LadderContextProvider } from "@/ui/components/ladder/context/LadderContext";
import LadderFlow from "@/ui/components/ladder/flow/LadderFlow";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type OffscreenProgram =
	| { type: "grafcet"; program: Grafcet }
	| { type: "ladder"; program: Ladder };

export interface OffscreenProgramRendererHandle {
	/** Retourne l'élément DOM racine du programme demandé, ou null s'il n'est pas monté. */
	getElement(programId: string): HTMLElement | null;
}

/**
 * Monte des programmes GRAFCET/Ladder dans un conteneur hors-écran (portail sur document.body)
 * avec une largeur fixe de 1200px. Chaque programme signale qu'il est prêt via `onProgramReady`.
 *
 * Le conteneur est invisible (position absolute, hors viewport) mais possède des dimensions
 * réelles pour que React Flow puisse calculer son layout correctement.
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
			return containerRef.current?.querySelector(`[data-offscreen-id="${programId}"]`) ?? null;
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
				visibility: "hidden",
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

	// Sonde l'apparition de l'instance React Flow (rfInstance) via rAF.
	// GrafcetFlow appelle viewManager.setReactFlowInstance dans onInit :
	// dès que l'élément .react-flow__viewport est présent dans le DOM, le rendu est terminé.
	useEffect(() => {
		let rafId: number;
		let attempts = 0;
		const MAX = 200; // ~3s à 60fps

		const poll = () => {
			if (readyFired.current) return;
			const viewport = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
			if (viewport) {
				readyFired.current = true;
				onReady(grafcet.id, wrapperRef.current!);
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
			style={{ width: 1200, height: 900, overflow: "hidden" }}
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
			const viewport = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
			if (viewport) {
				readyFired.current = true;
				onReady(ladder.id, wrapperRef.current!);
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
			style={{ width: 1200, height: 900, overflow: "hidden" }}
		>
			<LadderContextProvider initialLadder={ladder}>
				<LadderFlow />
			</LadderContextProvider>
		</div>
	);
}
