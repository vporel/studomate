import { SNAP_GRID } from "@/ui/components/hmi/logic/constants";
import { getT } from "@/ui/i18n/translateGlobal";
import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { activeCopyCutPasteManager } from "@/ui/stores/project/copy-cut-paste";
import { canEdit } from "@/ui/stores/project/editability";
import type { ProjectStoreState } from "@/ui/stores/project/project.store.types";
import { toast } from "react-toastify";
import type { StoreApi } from "zustand";

/** Pas d'un appui flèche pour déplacer les widgets HMI sélectionnés : un pas de grille. */
const HMI_ARROW_DELTAS: Record<string, [number, number]> = {
	ArrowUp: [0, -SNAP_GRID],
	ArrowDown: [0, SNAP_GRID],
	ArrowLeft: [-SNAP_GRID, 0],
	ArrowRight: [SNAP_GRID, 0],
};

export type ShortcutEvent = Pick<
	KeyboardEvent,
	| "key"
	| "ctrlKey"
	| "metaKey"
	| "shiftKey"
	| "stopPropagation"
	| "preventDefault"
> & { target: EventTarget | null };

/** Grafcet and ladder edits cannot propagate to the project outside design mode. */
function isProgramScope(scopeType: string | null | undefined) {
	return scopeType === "grafcet" || scopeType === "ladder";
}

/**
 * Raccourcis qui agissent sur le document actif du projet : tout sélectionner, annuler,
 * rétablir, copier, couper, coller, supprimer et déplacer les widgets HMI. Retourne `true` si le
 * raccourci a été pris en charge. La saisie dans un champ de texte n'en déclenche aucun.
 */
export default function handleEditingShortcut(
	e: ShortcutEvent,
	store: StoreApi<ProjectStoreState>,
): boolean {
	const target = e.target as HTMLElement | null;
	if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA")
		return false;
	const state = store.getState();
	const editable = canEdit(state);
	const copyCutPaste = activeCopyCutPasteManager(state);
	const consume = () => {
		e.stopPropagation();
		e.preventDefault();
	};

	if (e.ctrlKey || e.metaKey) {
		switch (e.key.toLowerCase()) {
			case "a": {
				consume();
				if (!editable) return true;
				if (state.activeScopeType === "grafcet") {
					state.grafcetsManager
						.getActiveStoreManagers()
						?.viewManager.selectAllNodesAndEdges();
				} else if (state.activeScopeType === "ladder") {
					state.laddersManager
						.getActiveStoreManagers()
						?.workflowManager.selectAllInActiveSection();
				} else if (state.activeScopeType === "hmi") {
					state.hmiManager.getActiveStoreManagers()?.selectAllWidgets();
				}
				return true;
			}
			case "z":
				consume();
				state.undoActiveScope();
				return true;
			case "y":
				consume();
				state.redoActiveScope();
				return true;
			case "c":
				consume();
				copyCutPaste?.copySelectedElements();
				return true;
			case "v": {
				consume();
				if (!editable && isProgramScope(state.activeScopeType)) return true;
				const entry = state.clipboard.getState().entry;
				if (
					entry &&
					(isProgramScope(state.activeScopeType) ||
						state.activeScopeType === "hmi") &&
					entry.scope !== state.activeScopeType
				) {
					toast.error(getT("toasts")("pasteWrongScope"));
					return true;
				}
				copyCutPaste?.pasteElements(getLastMousePosition());
				return true;
			}
			case "x":
				consume();
				if (!editable && isProgramScope(state.activeScopeType)) return true;
				copyCutPaste?.cutSelectedElements();
				return true;
		}
		return false;
	}

	if ((e.key === "Delete" || e.key === "Backspace") && editable) {
		//Le grafcet/ladder gèrent leur propre suppression (React Flow, deleteKeyCode) :
		//seul le canvas HMI (une simple <div>, pas de mécanisme natif) en a besoin ici.
		if (state.activeScopeType !== "hmi") return false;
		consume();
		state.hmiManager.getActiveStoreManagers()?.removeSelectedWidgets();
		return true;
	}

	if (editable && HMI_ARROW_DELTAS[e.key] && state.activeScopeType === "hmi") {
		//Déplacement des widgets sélectionnés à la grille (grafcet/ladder ont leur propre
		//gestion des flèches ; le canvas HMI est une simple <div>).
		consume();
		const [dx, dy] = HMI_ARROW_DELTAS[e.key];
		state.hmiManager.getActiveStoreManagers()?.moveSelectedWidgets(dx, dy);
		return true;
	}
	return false;
}
