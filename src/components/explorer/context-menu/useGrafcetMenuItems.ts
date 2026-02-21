"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useGrafcetMenuItems(): (grafcetId: string) => ContextMenuItemType[][] {
	const { deleteGrafcet, openPage, getGrafcet } = useProjectStore(
		useShallow((state) => ({
			deleteGrafcet: state.deleteGrafcet,
			openPage: state.openPage,
			getGrafcet: state.getGrafcet,
		})),
	);

	return useCallback(
		(grafcetId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							const grafcet = getGrafcet(grafcetId);
							if (grafcet) {
								openPage({
									id: grafcetId,
									type: "grafcet",
									title: grafcet.name,
								});
							}
						},
					},
				],
				[
					{
						label: "Renommer",
						onClick: () => explorerContextMenuEventsOut.emit("grafcet-rename", { grafcetId }),
						shortcut: "F2",
					},
					{
						label: "Supprimer",
						onClick: () => {
							if (confirm("Êtes-vous sûr de vouloir supprimer ce grafcet ?")) {
								deleteGrafcet(grafcetId);
							}
						},
					},
				],
			];
		},
		[openPage, deleteGrafcet, getGrafcet],
	);
}
