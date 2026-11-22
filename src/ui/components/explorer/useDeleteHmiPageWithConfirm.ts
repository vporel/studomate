"use client";

import { useT } from "@/ui/i18n/useT";
import { useCallback } from "react";
import { useProjectStore } from "../projects/ProjectContext";

/** Asks for confirmation, then deletes the HMI page from the project. */
export default function useDeleteHmiPageWithConfirm(): (
	hmiPageId: string,
) => void {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const tc = useT("explorer.confirmDelete");

	return useCallback(
		(hmiPageId: string) => {
			if (confirm(tc("hmiPage"))) hmiManager.deleteHmiPage(hmiPageId);
		},
		[hmiManager, tc],
	);
}
