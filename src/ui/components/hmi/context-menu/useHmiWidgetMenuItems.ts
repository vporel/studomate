"use client";

import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import { useCallback } from "react";

/**
 * Menu d'un widget du canvas — agit sur la sélection courante, pas seulement le widget cliqué :
 * `HmiCanvas` s'assure qu'il en fait partie avant d'ouvrir ce menu (le remplaçant sinon), pour
 * qu'un clic droit sur un widget d'un groupe déjà sélectionné agisse sur tout le groupe.
 */
export default function useHmiWidgetMenuItems(): () => ContextMenuItemType[][] {
	const copyCutPasteManager = useHmiStore((s) => s.copyCutPasteManager);
	const removeSelectedWidgets = useHmiStore((s) => s.removeSelectedWidgets);
	const alignSelectedWidgets = useHmiStore((s) => s.alignSelectedWidgets);
	const selectedWidgetIds = useHmiStore((s) => s.selectedWidgetIds);
	const widgets = useHmiStore((s) => s.hmiPage.widgets);
	const bringForward = useHmiStore((s) => s.bringForward);
	const sendBackward = useHmiStore((s) => s.sendBackward);
	const bringToFront = useHmiStore((s) => s.bringToFront);
	const sendToBack = useHmiStore((s) => s.sendToBack);

	return useCallback(() => {
		const items: ContextMenuItemType[][] = [
			[
				{
					label: "Copier",
					shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
					onClick: () => copyCutPasteManager.copySelectedWidgets(),
				},
				{
					label: "Couper",
					shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
					onClick: () => copyCutPasteManager.cutSelectedWidgets(),
				},
			],
		];

		// Ordre d'empilement : n'a de sens que pour un widget à la fois — masqué (pas seulement
		// désactivé) pour une sélection multiple, contrairement à "déjà au premier/arrière-plan"
		// ci-dessous, qui reste visible mais grisé.
		if (selectedWidgetIds.length === 1) {
			const widget = widgets[selectedWidgetIds[0]];
			if (widget) {
				const isBackmost = Object.values(widgets).every(
					(w) => w.stackOrder >= widget.stackOrder,
				);
				const isFrontmost = Object.values(widgets).every(
					(w) => w.stackOrder <= widget.stackOrder,
				);
				items.push([
					{
						label: "Avancer",
						onClick: () => bringForward(widget.id),
						disabled: isFrontmost,
					},
					{
						label: "Mettre au premier plan",
						onClick: () => bringToFront(widget.id),
						disabled: isFrontmost,
					},
					{
						label: "Reculer",
						onClick: () => sendBackward(widget.id),
						disabled: isBackmost,
					},
					{
						label: "Mettre en arrière-plan",
						onClick: () => sendToBack(widget.id),
						disabled: isBackmost,
					},
				]);
			}
		}

		// Alignement : n'a de sens qu'à partir de deux widgets (voir
		// `HmiStoreState.alignSelectedWidgets`).
		if (selectedWidgetIds.length > 1) {
			items.push([
				{
					label: "Alignement",
					subItems: [
						{
							label: "Vers le haut",
							onClick: () => alignSelectedWidgets("top"),
						},
						{
							label: "Vers le bas",
							onClick: () => alignSelectedWidgets("bottom"),
						},
						{
							label: "Au centre vertical",
							onClick: () => alignSelectedWidgets("center-vertical"),
						},
						{ divider: true },
						{ label: "À gauche", onClick: () => alignSelectedWidgets("left") },
						{ label: "À droite", onClick: () => alignSelectedWidgets("right") },
						{
							label: "Au centre horizontal",
							onClick: () => alignSelectedWidgets("center-horizontal"),
						},
					],
				},
			]);
		}

		items.push([
			{
				label: "Supprimer",
				shortcut: "Suppr",
				onClick: removeSelectedWidgets,
			},
		]);

		return items;
	}, [
		copyCutPasteManager,
		removeSelectedWidgets,
		alignSelectedWidgets,
		selectedWidgetIds,
		widgets,
		bringForward,
		sendBackward,
		bringToFront,
		sendToBack,
	]);
}
