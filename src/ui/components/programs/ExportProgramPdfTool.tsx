"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import useExportProgramPdf from "@/ui/pdf/useExportProgramPdf";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

/** Toolbar icon downloading the program as a PDF. Renders nothing when PDF export is unavailable. */
export default function ExportProgramPdfTool({
	config,
}: {
	config: PdfExportProgramConfig;
}) {
	const t = useT("projects.export");
	const pdfExport = useProjectStore((s) => s.capabilities.pdfExport);
	const exportProgram = useExportProgramPdf(config);
	if (!pdfExport) return null;
	return (
		<AppTool
			name="export-pdf"
			label={t("exportProgramPdf")}
			onClick={exportProgram}
		>
			<FileDownloadOutlinedIcon />
		</AppTool>
	);
}
