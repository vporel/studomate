"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { PdfCoverPage } from "@/ui/lib/pdf/pdf-exporter";
import { LadderRenderContext } from "@/ui/lib/program-export-drawing/ladder-render-context";
import { exportProject } from "@/ui/utils/project/project-export-utils";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	FormControlLabel,
	LinearProgress,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { PdfExportProgramConfig, usePdfExport } from "../pdf/usePdfExport";
import { useProjectStore } from "./ProjectContext";
import { useT } from "@/ui/i18n/useT";

type ExportFormat = "pdf" | "json";
type PdfScope = "full" | "active";

export default function ExportModal() {
	const {
		exportModalVisible,
		setExportModalVisible,
		project,
		activeScope,
		activeScopeType,
	} = useProjectStore(
		useShallow((s) => ({
			exportModalVisible: s.ui.exportModalVisible,
			setExportModalVisible: s.setExportModalVisible,
			project: s.project,
			activeScope: s.activeScope,
			activeScopeType: s.activeScopeType,
		})),
	);

	const grafcets: Grafcet[] = useMemo(
		() => (project ? Object.values(project.grafcets) : []),
		[project],
	);
	const ladders: Ladder[] = useMemo(
		() => (project ? Object.values(project.ladders) : []),
		[project],
	);

	const activeProgram: PdfExportProgramConfig | null = useMemo(() => {
		if (!project) return null;
		if (activeScopeType === "grafcet" && project.grafcets[activeScope])
			return { type: "grafcet", program: project.grafcets[activeScope] };
		if (activeScopeType === "ladder" && project.ladders[activeScope])
			return { type: "ladder", program: project.ladders[activeScope] };
		return null;
	}, [project, activeScope, activeScopeType]);

	const t = useT("projects.export");
	const tc = useT("projects.common");
	const tBlock = useT("ladderEditor.block");

	const ladderContext = useMemo<LadderRenderContext>(
		() => ({
			programName: (id) =>
				project?.ladders[id]?.name ?? project?.grafcets[id]?.name,
			blockStaticLabel: (blockType) =>
				blockType === "assign"
					? tBlock("assignStaticLabel")
					: blockType === "arithmetic"
						? tBlock("arithmeticStaticLabel")
						: undefined,
		}),
		[project, tBlock],
	);
	const [format, setFormat] = useState<ExportFormat>("pdf");
	const [scope, setScope] = useState<PdfScope>("full");
	const [includeCover, setIncludeCover] = useState(true);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [filename, setFilename] = useState("");

	// Initialise les champs quand la modale s'ouvre
	useEffect(() => {
		if (!exportModalVisible || !project) return;
		const ids = [
			...Object.values(project.grafcets),
			...Object.values(project.ladders),
		].map((p) => p.id);
		setFormat("pdf");
		setScope("full");
		setIncludeCover(true);
		setSelectedIds(new Set(ids));
		setFilename(project.name);
	}, [exportModalVisible, project]);

	const { exportState, startExport, reset } = usePdfExport();
	const isExporting =
		exportState.status !== "idle" && exportState.status !== "error";

	const toggleId = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const onClose = useCallback(() => {
		if (isExporting) return;
		reset();
		setExportModalVisible(false);
	}, [isExporting, reset, setExportModalVisible]);

	const changeScope = useCallback(
		(next: PdfScope) => {
			setScope(next);
			if (next === "active" && activeProgram)
				setFilename(activeProgram.program.name);
			else if (project) setFilename(project.name);
		},
		[activeProgram, project],
	);

	const buildCover = useCallback((): PdfCoverPage | undefined => {
		if (!project || !includeCover) return undefined;
		const date = new Date().toLocaleDateString();
		const stats = {
			grafcets: Object.keys(project.grafcets).length,
			ladders: Object.keys(project.ladders).length,
			variables: project.variables.length,
		};
		return {
			projectName: project.name,
			author: project.author || undefined,
			date,
			statement: project.exercise?.statement,
			stats,
			labels: {
				author: project.author
					? t("coverAuthor", { author: project.author })
					: undefined,
				exportedOn: t("coverExportedOn", { date }),
				stats: t("coverStats", stats),
				statementHeading: t("coverStatementHeading"),
			},
		};
	}, [project, includeCover, t]);

	const onExport = useCallback(() => {
		if (format === "json") {
			if (project) exportProject(project, filename || project.name);
			onClose();
			return;
		}
		if (scope === "active") {
			if (activeProgram)
				void startExport(
					[activeProgram],
					filename || activeProgram.program.name,
					undefined,
					ladderContext,
				);
			return;
		}
		const programs: PdfExportProgramConfig[] = [
			...grafcets
				.filter((g) => selectedIds.has(g.id))
				.map((g) => ({ type: "grafcet" as const, program: g })),
			...ladders
				.filter((l) => selectedIds.has(l.id))
				.map((l) => ({ type: "ladder" as const, program: l })),
		];
		void startExport(programs, filename || "export", buildCover(), ladderContext);
	}, [
		format,
		scope,
		project,
		activeProgram,
		grafcets,
		ladders,
		selectedIds,
		ladderContext,
		filename,
		startExport,
		buildCover,
		onClose,
	]);

	const exportDisabled =
		isExporting ||
		(format === "pdf" && scope === "full" && selectedIds.size === 0) ||
		(format === "pdf" && scope === "active" && !activeProgram);

	const progressValue = (() => {
		if (exportState.status === "rendering")
			return Math.round((exportState.current / exportState.total) * 90);
		if (exportState.status === "assembling") return 95;
		return 0;
	})();

	const progressLabel = (() => {
		if (exportState.status === "rendering")
			return t("progressRendering", { current: exportState.current, total: exportState.total, label: exportState.label });
		if (exportState.status === "assembling") return t("progressAssembling");
		return "";
	})();

	return (
		<CustomModal
			open={exportModalVisible}
			onClose={onClose}
			title={t("title")}
			width={480}
			closeButton={!isExporting}
		>
				<Box display="flex" flexDirection="column" gap={2}>
					<RadioGroup
						row
						value={format}
						onChange={(e) => setFormat(e.target.value as ExportFormat)}
					>
						<FormControlLabel
							value="pdf"
							control={<Radio size="small" disabled={isExporting} />}
							label={t("formatPdf")}
						/>
						<FormControlLabel
							value="json"
							control={<Radio size="small" disabled={isExporting} />}
							label={t("formatJson")}
						/>
					</RadioGroup>

					{format === "pdf" && (
						<>
							<RadioGroup
								value={scope}
								onChange={(e) => changeScope(e.target.value as PdfScope)}
							>
								<FormControlLabel
									value="full"
									control={<Radio size="small" disabled={isExporting} />}
									label={t("scopeFull")}
								/>
								<FormControlLabel
									value="active"
									control={
										<Radio
											size="small"
											disabled={isExporting || !activeProgram}
										/>
									}
									label={
										activeProgram
											? t("scopeActiveNamed", { name: activeProgram.program.name })
											: t("scopeActive")
									}
								/>
							</RadioGroup>
							{!activeProgram && (
								<Typography variant="caption" color="text.secondary">
									{t("openProgramHint")}
								</Typography>
							)}

							{scope === "full" && (
								<>
									<FormControlLabel
										control={
											<Checkbox
												checked={includeCover}
												onChange={(e) => setIncludeCover(e.target.checked)}
												disabled={isExporting}
												size="small"
											/>
										}
										label={t("includeCover")}
									/>
									<Box>
										{grafcets.length > 0 && (
											<Typography
												variant="subtitle2"
												sx={{ mb: 0.5, fontWeight: 600 }}
											>
												{t("grafcets")}
											</Typography>
										)}
										{grafcets.map((g) => (
											<FormControlLabel
												key={g.id}
												control={
													<Checkbox
														checked={selectedIds.has(g.id)}
														onChange={() => toggleId(g.id)}
														disabled={isExporting}
														size="small"
													/>
												}
												label={g.name}
											/>
										))}

										{ladders.length > 0 && (
											<Typography
												variant="subtitle2"
												sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}
											>
												{t("ladders")}
											</Typography>
										)}
										{ladders.map((l) => (
											<FormControlLabel
												key={l.id}
												control={
													<Checkbox
														checked={selectedIds.has(l.id)}
														onChange={() => toggleId(l.id)}
														disabled={isExporting}
														size="small"
													/>
												}
												label={t("ladderLandscape", { name: l.name })}
											/>
										))}
									</Box>
								</>
							)}
						</>
					)}

					<TextField
						label={t("filename")}
						value={filename}
						onChange={(e) => setFilename(e.target.value)}
						size="small"
						disabled={isExporting}
						fullWidth
					/>

					{isExporting && (
						<Box>
							<LinearProgress
								variant="determinate"
								value={progressValue}
								sx={{ mb: 0.5 }}
							/>
							<Typography variant="caption" color="text.secondary">
								{progressLabel}
							</Typography>
						</Box>
					)}

					{exportState.status === "error" && (
						<Alert severity="error" onClose={reset}>
							{exportState.message}
						</Alert>
					)}

					<Box display="flex" justifyContent="flex-end" gap={1}>
						<Button onClick={onClose} disabled={isExporting} variant="outlined">
							{tc("cancel")}
						</Button>
						<Button
							variant="contained"
							onClick={onExport}
							disabled={exportDisabled}
						>
							{isExporting ? t("exporting") : t("title")}
						</Button>
					</Box>
				</Box>
			</CustomModal>
	);
}
