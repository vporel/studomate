"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import CustomModal from "@/ui/components/mui/CustomModal";
import { PDF_PAGE_NUMBER, PdfCoverPage } from "@/ui/pdf/pdf-exporter";
import {
	buildProjectVariablesSections,
	buildVariableGroupSection,
} from "@/ui/pdf/variables-table-pdf";
import { exportProject } from "@/ui/components/projects/project-export";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Divider,
	FormControlLabel,
	LinearProgress,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
	buildImageRequests,
	ImageFormat,
	toSafeFileName,
} from "@/ui/image-export/program-image-export";
import { useImageExport } from "@/ui/image-export/useImageExport";
import useLadderRenderContext from "@/ui/pdf/useLadderRenderContext";
import useSingleExportPageFrame from "@/ui/pdf/useSingleExportPageFrame";
import { PdfExportProgramConfig, usePdfExport } from "@/ui/pdf/usePdfExport";
import { usePageTitle } from "../pages/usePageTitle";
import {
	getVariablesPageDefinition,
	isVariablesPageId,
	type VariablesPageId,
} from "@/ui/stores/project/variables-pages";
import { useProjectStore } from "./ProjectContext";
import { useT } from "@/ui/i18n/useT";

type ExportFormat = "pdf" | "image" | "json";
type PdfScope = "full" | "active";
type ImageScope = "full" | "active";

/** Cible d'un export « page active » : un programme ou une page de variables utilisateur. */
type ActiveExport =
	| { kind: "program"; config: PdfExportProgramConfig; name: string }
	| { kind: "variables"; pageId: VariablesPageId; name: string };

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

	const t = useT("projects.export");
	const tc = useT("projects.common");
	const tColumns = useT("pages.variablesGrid.columns");
	const tPageTitles = useT("pages.titles");
	const pageTitle = usePageTitle();

	const columnLabels = useMemo(
		() => ({
			mnemonic: tColumns("mnemonic"),
			type: tColumns("type"),
			address: tColumns("address"),
			declaredValue: tColumns("declaredValue"),
			comment: tColumns("comment"),
		}),
		[tColumns],
	);

	const activeExport: ActiveExport | null = useMemo(() => {
		if (!project) return null;
		if (activeScopeType === "grafcet" && project.grafcets[activeScope])
			return {
				kind: "program",
				config: { type: "grafcet", program: project.grafcets[activeScope] },
				name: project.grafcets[activeScope].name,
			};
		if (activeScopeType === "ladder" && project.ladders[activeScope])
			return {
				kind: "program",
				config: { type: "ladder", program: project.ladders[activeScope] },
				name: project.ladders[activeScope].name,
			};
		if (isVariablesPageId(activeScope))
			return {
				kind: "variables",
				pageId: activeScope,
				name: pageTitle({ id: activeScope, type: "variables", title: "" }),
			};
		return null;
	}, [project, activeScope, activeScopeType, pageTitle]);

	const ladderContext = useLadderRenderContext();
	const buildPageFrame = useSingleExportPageFrame();
	const [format, setFormat] = useState<ExportFormat>("pdf");
	const [scope, setScope] = useState<PdfScope>("full");
	const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
	const [imageScope, setImageScope] = useState<ImageScope>("full");
	const [includeCover, setIncludeCover] = useState(true);
	const [includeVariables, setIncludeVariables] = useState(true);
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
		setImageFormat("png");
		setImageScope("full");
		setIncludeCover(true);
		setIncludeVariables(true);
		setSelectedIds(new Set(ids));
		setFilename(project.name);
	}, [exportModalVisible, project]);

	const pdfExport = usePdfExport();
	const imageExport = useImageExport();
	const { startExport } = pdfExport;
	const exportState =
		format === "image" ? imageExport.exportState : pdfExport.exportState;
	const isExporting =
		exportState.status !== "idle" && exportState.status !== "error";
	const { reset: resetPdf } = pdfExport;
	const { reset: resetImage, startExport: startImageExport } = imageExport;
	const reset = useCallback(() => {
		resetPdf();
		resetImage();
	}, [resetPdf, resetImage]);

	const activeProgram = activeExport?.kind === "program" ? activeExport : null;

	const selectedPrograms: PdfExportProgramConfig[] = useMemo(
		() => [
			...grafcets
				.filter((g) => selectedIds.has(g.id))
				.map((g) => ({ type: "grafcet" as const, program: g })),
			...ladders
				.filter((l) => selectedIds.has(l.id))
				.map((l) => ({ type: "ladder" as const, program: l })),
		],
		[grafcets, ladders, selectedIds],
	);

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
			if (next === "active" && activeExport) setFilename(activeExport.name);
			else if (project) setFilename(project.name);
		},
		[activeExport, project],
	);

	const changeImageScope = useCallback(
		(next: ImageScope) => {
			setImageScope(next);
			if (next === "active" && activeProgram) setFilename(activeProgram.name);
			else if (project) setFilename(project.name);
		},
		[activeProgram, project],
	);

	const changeFormat = useCallback(
		(next: ExportFormat) => {
			setFormat(next);
			if (next === "pdf") changeScope(scope);
			else if (next === "image") changeImageScope(imageScope);
			else if (project) setFilename(project.name);
		},
		[changeScope, changeImageScope, scope, imageScope, project],
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
		if (format === "image") {
			if (!project) return;
			const programs =
				imageScope === "active"
					? activeProgram
						? [activeProgram.config]
						: []
					: selectedPrograms;
			const name = toSafeFileName(filename || project.name);
			void startImageExport(
				buildImageRequests(programs, {
					projectName: project.name,
					filename: name,
				}),
				imageFormat,
				name,
				ladderContext,
			);
			return;
		}
		if (scope === "active") {
			if (!activeExport || !project) return;
			const name = filename || activeExport.name;
			if (activeExport.kind === "program") {
				void startExport([activeExport.config], name, {
					ladderContext,
					pageFrame: buildPageFrame(),
				});
			} else {
				void startExport([], name, {
					pageFrame: buildPageFrame(),
					variableSections: [
						buildVariableGroupSection(
							getVariablesPageDefinition(activeExport.pageId).group,
							project.variables,
							activeExport.name,
							columnLabels,
						),
					],
				});
			}
			return;
		}
		const programs = selectedPrograms;
		const variableSections =
			includeVariables && project
				? buildProjectVariablesSections(project.variables, {
						columns: columnLabels,
						groups: {
							input: tPageTitles("inputVariables"),
							output: tPageTitles("outputVariables"),
							memory: tPageTitles("memoryVariables"),
							constant: tPageTitles("constantVariables"),
						},
					})
				: [];
		const cover = buildCover();
		void startExport(programs, filename || "export", {
			cover,
			pageFrame: {
				headerLeft: project?.name,
				footerLeft: project?.author
					? t("coverAuthor", { author: project.author })
					: undefined,
				footerRight: PDF_PAGE_NUMBER,
			},
			coverPageFrame: cover ? { footerRight: PDF_PAGE_NUMBER } : undefined,
			ladderContext,
			variableSections,
		});
	}, [
		format,
		scope,
		project,
		activeExport,
		activeProgram,
		buildPageFrame,
		startImageExport,
		imageFormat,
		imageScope,
		selectedPrograms,
		includeVariables,
		ladderContext,
		filename,
		startExport,
		buildCover,
		t,
		onClose,
		columnLabels,
		tPageTitles,
	]);

	const exportDisabled =
		isExporting ||
		(format === "pdf" &&
			scope === "full" &&
			selectedIds.size === 0 &&
			!includeVariables) ||
		(format === "pdf" && scope === "active" && !activeExport) ||
		(format === "image" &&
			((imageScope === "full" && selectedIds.size === 0) ||
				(imageScope === "active" && !activeProgram)));

	const progressValue = (() => {
		if (exportState.status === "rendering")
			return Math.round((exportState.current / exportState.total) * 90);
		if (exportState.status === "assembling") return 95;
		return 0;
	})();

	const progressLabel = (() => {
		if (exportState.status === "rendering")
			return t("progressRendering", {
				current: exportState.current,
				total: exportState.total,
				label: exportState.label,
			});
		if (exportState.status === "assembling") return t("progressAssembling");
		return "";
	})();

	const programChecklist = (
		<Box>
			{grafcets.length > 0 && (
				<Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
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
					label={l.name}
				/>
			))}
		</Box>
	);

	return (
		<CustomModal
			open={exportModalVisible}
			onClose={onClose}
			title={t("title")}
			width={560}
			closeButton={!isExporting}
		>
			<Box display="flex" flexDirection="column" gap={2}>
				<RadioGroup
					row
					value={format}
					onChange={(e) => changeFormat(e.target.value as ExportFormat)}
				>
					<FormControlLabel
						value="pdf"
						control={<Radio size="small" disabled={isExporting} />}
						label={t("formatPdf")}
					/>
					<FormControlLabel
						value="image"
						control={<Radio size="small" disabled={isExporting} />}
						label={t("formatImage")}
					/>
					<FormControlLabel
						value="json"
						control={<Radio size="small" disabled={isExporting} />}
						label={t("formatJson")}
					/>
				</RadioGroup>

				<Divider sx={{ mt: -1 }} />

				{format === "pdf" && (
					<>
						<RadioGroup
							row
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
									<Radio size="small" disabled={isExporting || !activeExport} />
								}
								label={
									activeExport
										? t("scopeActiveNamed", { name: activeExport.name })
										: t("scopeActive")
								}
							/>
						</RadioGroup>
						{!activeExport && (
							<Typography variant="caption" color="text.secondary">
								{t("openProgramHint")}
							</Typography>
						)}

						{scope === "full" && (
							<>
								<Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3 }}>
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
									<FormControlLabel
										control={
											<Checkbox
												checked={includeVariables}
												onChange={(e) => setIncludeVariables(e.target.checked)}
												disabled={isExporting}
												size="small"
											/>
										}
										label={t("includeVariables")}
									/>
								</Box>
								{programChecklist}
							</>
						)}
					</>
				)}

				{format === "image" && (
					<>
						<RadioGroup
							row
							value={imageFormat}
							onChange={(e) => setImageFormat(e.target.value as ImageFormat)}
						>
							<FormControlLabel
								value="png"
								control={<Radio size="small" disabled={isExporting} />}
								label="PNG"
							/>
							<FormControlLabel
								value="svg"
								control={<Radio size="small" disabled={isExporting} />}
								label="SVG"
							/>
						</RadioGroup>
						<RadioGroup
							row
							value={imageScope}
							onChange={(e) => changeImageScope(e.target.value as ImageScope)}
						>
							<FormControlLabel
								value="full"
								control={<Radio size="small" disabled={isExporting} />}
								label={t("imageScopeFull")}
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
										? t("imageScopeActiveNamed", { name: activeProgram.name })
										: t("imageScopeActive")
								}
							/>
						</RadioGroup>
						{!activeProgram && (
							<Typography variant="caption" color="text.secondary">
								{t("imageOpenProgramHint")}
							</Typography>
						)}
						{imageScope === "full" && programChecklist}
						<Typography variant="caption" color="text.secondary">
							{t("imageZipHint")}
						</Typography>
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
