"use client";

import { useEffect } from "react";
import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import { useLadderContext } from "../context/LadderContext";

/**
 * Gère la sélection des sections (`selectedSectionIds`) et ses raccourcis, via des listeners au
 * niveau `document`, actifs uniquement tant que la page ladder est l'onglet visible :
 *
 * - clic sur un en-tête de section (`data-section-header`) → sélectionne cette seule section ;
 * - Ctrl/Cmd+clic → ajoute/retire la section de la sélection ;
 * - Shift+clic → étend la sélection de l'ancre jusqu'à cette section, dans l'ordre du ladder ;
 * - clic ailleurs (flow de la section sélectionnée inclus, reste de l'app) → vide la sélection ;
 * - Suppr / Retour arrière avec au moins une section sélectionnée → supprime les sections
 *   sélectionnées (voir `LadderWorkflowManager.deleteSections`).
 *
 * Toute sélection de section vide aussi la sélection d'éléments de toutes les sections. Les
 * boutons d'action de l'en-tête arrêtent la propagation du pointer-down pour ne pas y entrer.
 */
export default function useLadderSectionSelection() {
	const store = useLadderContext()?.store ?? null;
	const visible = usePageVisible();

	useEffect(() => {
		if (!store || !visible) return;
		let anchorId: string | null = null;

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Element | null;
			const header = target?.closest?.("[data-section-header]");
			const sectionId = header?.getAttribute("data-section-header") ?? null;
			const state = store.getState();

			if (!sectionId) {
				if (state.selectedSectionIds.length > 0) state.setSelectedSectionIds([]);
				anchorId = null;
				return;
			}

			const orderedIds = state.ladder.sections.map((s) => s.id);
			const current = state.selectedSectionIds;
			let next: string[];

			if (event.shiftKey && anchorId) {
				const a = orderedIds.indexOf(anchorId);
				const b = orderedIds.indexOf(sectionId);
				if (a === -1 || b === -1) {
					next = [sectionId];
					anchorId = sectionId;
				} else {
					const [lo, hi] = a < b ? [a, b] : [b, a];
					next = orderedIds.slice(lo, hi + 1);
				}
			} else if (event.ctrlKey || event.metaKey) {
				next = current.includes(sectionId)
					? current.filter((id) => id !== sectionId)
					: [...current, sectionId];
				anchorId = sectionId;
			} else {
				next = [sectionId];
				anchorId = sectionId;
			}

			const unchanged =
				next.length === current.length &&
				next.every((id) => current.includes(id));
			if (!unchanged) state.setSelectedSectionIds(next);
			state.workflowManager.deselectAllElements();
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Delete" && event.key !== "Backspace") return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" || target.tagName === "TEXTAREA")
			)
				return;
			const state = store.getState();
			if (state.selectedSectionIds.length === 0) return;
			event.preventDefault();
			event.stopPropagation();
			state.workflowManager.deleteSections(state.selectedSectionIds);
		};

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
			store.getState().setSelectedSectionIds([]);
		};
	}, [store, visible]);
}
