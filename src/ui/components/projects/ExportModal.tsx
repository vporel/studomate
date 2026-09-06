"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { PdfCoverPage } from "@/ui/lib/pdf/pdf-exporter";
import {
	buildProjectVariablesSections,
	buildVariableGroupSection,
	VariableGroupKey,
} from "@/ui/lib/pdf/variables-table-pdf";
import { exportProject } from "@/ui/utils/project/project-export-utils";
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
import useLadderRenderContext from "../pdf/useLadderRenderContext";
import { PdfExportProgramConfig, usePdfExport } from "../pdf/usePdfExport";
import { usePageTitle } from "../pages/usePageTitle";
import type { VariablesPageId } from "../pages/VariablesPage";
import { useProjectStore } from "./ProjectContext";
import { useT } from "@/ui/i18n/useT";

type ExportFormat = "pdf" | "json";
type PdfScope = "full" | "active";

const VARIABLES_PAGE_GROUP: Record<VariablesPageId, VariableGroupKey> = {
	"input-variables": "input",
	"output-variables": "output",
	"memory-variables": "memory",
};
const isVariablesPageId = (id: string): id is VariablesPageId =>
	id in VARIABLES_PAGE_GROUP;

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
	const [format, setFormat] = useState<ExportFormat>("pdf");
	const [scope, setScope] = useState<PdfScope>("full");
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
		setIncludeCover(true);
		setIncludeVariables(true);
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
			if (next === "active" && activeExport) setFilename(activeExport.name);
			else if (project) setFilename(project.name);
		},
		[activeExport, project],
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
			if (!activeExport || !project) return;
			const name = filename || activeExport.name;
			if (activeExport.kind === "program") {
				void startExport([activeExport.config], name, { ladderContext });
			} else {
				const date = new Date().toLocaleDateString();
				void startExport([], name, {
					variableSections: [
						buildVariableGroupSection(
							VARIABLES_PAGE_GROUP[activeExport.pageId],
							project.variables,
							t("variablesPdfHeading", {
								project: project.name,
								page: activeExport.name,
								date,
							}),
							columnLabels,
						),
					],
				});
			}
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
		const variableSections =
			includeVariables && project
				? buildProjectVariablesSections(project.variables, {
						columns: columnLabels,
						groups: {
							input: tPageTitles("inputVariables"),
							output: tPageTitles("outputVariables"),
							memory: tPageTitles("memoryVariables"),
						},
					})
				: [];
		void startExport(programs, filename || "export", {
			cover: buildCover(),
			ladderContext,
			variableSections,
		});
	}, [
		format,
		scope,
		project,
		activeExport,
		grafcets,
		ladders,
		selectedIds,
		includeVariables,
		ladderContext,
		filename,
		startExport,
		buildCover,
		onClose,
		t,
		columnLabels,
		tPageTitles,
	]);

	const exportDisabled =
		isExporting ||
		(format === "pdf" &&
			scope === "full" &&
			selectedIds.size === 0 &&
			!includeVariables) ||
		(format === "pdf" && scope === "active" && !activeExport);

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
			width={560}
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
										<Radio
											size="small"
											disabled={isExporting || !activeExport}
										/>
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
													onChange={(e) =>
														setIncludeVariables(e.target.checked)
													}
													disabled={isExporting}
													size="small"
												/>
											}
											label={t("includeVariables")}
										/>
									</Box>
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
												label={l.name}
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
