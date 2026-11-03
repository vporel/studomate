"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import executionMenuItems from "./execution-menu-items";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useProgramMenuItems(
	programType: "grafcet" | "ladder",
): (programId: string) => ContextMenuItemType[][] {
	const manager = useProjectStore((state) =>
		programType === "grafcet" ? state.grafcetsManager : state.laddersManager,
	);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const project = useProjectStore((state) => state.project);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	const t = useT("explorer.menu");
	const tc = useT("explorer.confirmDelete");

	return useCallback(
		(programId: string) => {
			return [
				[
					{
						label: t("open"),
						onClick: () => {
							const program = manager.getProgramOrThrow(programId);
							if (program) {
								pagesManager.openPage({
									id: programId,
									type: programType,
									title: program.name,
								});
							}
						},
					},
				],
				[
					{
						label: t("rename"),
						disabled: !designing,
						onClick: () =>
							programType === "grafcet"
								? explorerContextMenuEventsOut.emit("grafcet-rename", {
										grafcetId: programId,
									})
								: explorerContextMenuEventsOut.emit("ladder-rename", {
										ladderId: programId,
									}),
						shortcut: "F2",
					},
					{
						label: t("delete"),
						disabled: !designing,
						onClick: () => {
							if (confirm(tc(programType))) {
								manager.deleteProgramById(programId);
							}
						},
					},
				],
				...executionMenuItems(
					project?.getProgram(programId),
					manager,
					designing,
					t,
				),
			];
		},
		[manager, pagesManager, project, designing, programType, t, tc],
	);
}
