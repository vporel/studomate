"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import useExportProgramImage from "@/ui/image-export/useExportProgramImage";
import useExportProgramPdf from "@/ui/pdf/useExportProgramPdf";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { Box, Menu, MenuItem } from "@mui/material";
import { useRef, useState } from "react";

/**
 * Toolbar icon opening a menu to download the program returned by `getConfig` as a PDF, a PNG or
 * an SVG. Renders nothing when export is unavailable.
 */
export default function ExportProgramTool({
	getConfig,
}: {
	getConfig: () => PdfExportProgramConfig;
}) {
	const t = useT("projects.export");
	const canExport = useProjectStore((s) => s.capabilities.export);
	const exportPdf = useExportProgramPdf(getConfig);
	const exportPng = useExportProgramImage(getConfig, "png");
	const exportSvg = useExportProgramImage(getConfig, "svg");
	const anchorRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	if (!canExport) return null;

	const choose = (exportProgram: () => void) => () => {
		setOpen(false);
		exportProgram();
	};

	return (
		<>
			<Box ref={anchorRef} sx={{ display: "flex" }}>
				<AppTool
					name="export"
					label={t("exportProgram")}
					onClick={() => setOpen(true)}
				>
					<FileDownloadOutlinedIcon />
				</AppTool>
			</Box>
			<Menu
				anchorEl={anchorRef.current}
				open={open}
				onClose={() => setOpen(false)}
			>
				<MenuItem onClick={choose(exportPdf)}>{t("menuExportPdf")}</MenuItem>
				<MenuItem onClick={choose(exportPng)}>{t("menuExportPng")}</MenuItem>
				<MenuItem onClick={choose(exportSvg)}>{t("menuExportSvg")}</MenuItem>
			</Menu>
		</>
	);
}
