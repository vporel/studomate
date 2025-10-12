"use client";

import { useProjectContext } from "@/components/projects/ProjectContext";
import { useCallback } from "react";
import { PageData } from "./pages-data";

export default function useSavePageChanges(): (pageId: string, pageData: PageData) => void {
	const { saveGrafcetData } = useProjectContext();

	return useCallback(
		(pageId: string, pageData: PageData) => {
			if (pageData.type === "grafcet") {
				saveGrafcetData(pageId);
			}
		},
		[saveGrafcetData]
	);
}
