"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { PDF_PAGE_NUMBER, type PdfPageFrame } from "@/ui/lib/pdf/pdf-exporter";
import { useCallback } from "react";

/**
 * Builds the header/footer of a PDF holding a single program or variables page: project name at
 * the left of the header, "author — export date" at the left of the footer (the date alone without
 * author), and the page number "n/N" at the right of the footer. The date is read when the returned function is called.
 */
export default function useSingleExportPageFrame(): () => PdfPageFrame {
	const projectName = useProjectStore((s) => s.project?.name);
	const author = useProjectStore((s) => s.project?.author);
	const t = useT("projects.export");

	return useCallback(() => {
		const exportedOn = t("coverExportedOn", {
			date: new Date().toLocaleDateString(),
		});
		return {
			headerLeft: projectName,
			footerLeft: author
				? `${t("coverAuthor", { author })} — ${exportedOn}`
				: exportedOn,
			footerRight: PDF_PAGE_NUMBER,
		};
	}, [projectName, author, t]);
}
