"use client";

import { getProgramPageData } from "@/ui/stores/project/pages-data";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import useDeleteProgramWithConfirm from "../useDeleteProgramWithConfirm";
import executionMenuItems from "./execution-menu-items";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";
import useCanEditProject from "@/ui/components/projects/useCanEditProject";

export default function useProgramMenuItems(
	programType: "grafcet" | "ladder",
): (programId: string) => ContextMenuItemType[][] {
	const manager = useProjectStore((state) =>
		programType === "grafcet" ? state.grafcetsManager : state.laddersManager,
	);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const project = useProjectStore((state) => state.project);
	const designing = useCanEditProject();

	const t = useT("explorer.menu");
	const deleteProgram = useDeleteProgramWithConfirm(programType);

	return useCallback(
		(programId: string) => {
			return [
				[
					{
						label: t("open"),
						onClick: () => {
							const program = manager.getProgramOrThrow(programId);
							if (program) {
								pagesManager.openPage(getProgramPageData(program));
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
						onClick: () => deleteProgram(programId),
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
		[manager, pagesManager, project, designing, programType, t, deleteProgram],
	);
}
