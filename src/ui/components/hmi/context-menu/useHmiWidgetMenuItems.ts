"use client";

import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";

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
	const t = useT("hmiEditor.menu");

	return useCallback(() => {
		const items: ContextMenuItemType[][] = [
			[
				{
					label: t("copy"),
					shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
					onClick: () => copyCutPasteManager.copySelectedElements(),
				},
				{
					label: t("cut"),
					shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
					onClick: () => copyCutPasteManager.cutSelectedElements(),
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
						label: t("bringForward"),
						onClick: () => bringForward(widget.id),
						disabled: isFrontmost,
					},
					{
						label: t("bringToFront"),
						onClick: () => bringToFront(widget.id),
						disabled: isFrontmost,
					},
					{
						label: t("sendBackward"),
						onClick: () => sendBackward(widget.id),
						disabled: isBackmost,
					},
					{
						label: t("sendToBack"),
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
					label: t("alignment"),
					subItems: [
						{
							label: t("alignTop"),
							onClick: () => alignSelectedWidgets("top"),
						},
						{
							label: t("alignBottom"),
							onClick: () => alignSelectedWidgets("bottom"),
						},
						{
							label: t("alignMiddle"),
							onClick: () => alignSelectedWidgets("center-vertical"),
						},
						{ divider: true },
						{ label: t("alignLeft"), onClick: () => alignSelectedWidgets("left") },
						{ label: t("alignRight"), onClick: () => alignSelectedWidgets("right") },
						{
							label: t("alignCenter"),
							onClick: () => alignSelectedWidgets("center-horizontal"),
						},
					],
				},
			]);
		}

		items.push([
			{
				label: t("delete"),
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
		t,
	]);
}
