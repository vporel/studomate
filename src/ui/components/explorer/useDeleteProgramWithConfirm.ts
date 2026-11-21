"use client";

import { useT } from "@/ui/i18n/useT";
import { useCallback } from "react";
import { useProjectStore } from "../projects/ProjectContext";

/** Asks for confirmation, then deletes the program from the project. */
export default function useDeleteProgramWithConfirm(
	programType: "grafcet" | "ladder",
): (programId: string) => void {
	const manager = useProjectStore((state) =>
		programType === "grafcet" ? state.grafcetsManager : state.laddersManager,
	);
	const tc = useT("explorer.confirmDelete");

	return useCallback(
		(programId: string) => {
			if (confirm(tc(programType))) manager.deleteProgramById(programId);
		},
		[manager, programType, tc],
	);
}
