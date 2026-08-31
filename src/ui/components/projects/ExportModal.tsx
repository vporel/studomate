"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { PdfCoverPage } from "@/ui/lib/pdf/pdf-exporter";
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
import OffscreenProgramRenderer from "../pdf/OffscreenProgramRenderer";
import { PdfExportProgramConfig, usePdfExport } from "../pdf/usePdfExport";
import { useProjectStore } from "./ProjectContext";

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

	const { exportState, offscreenPrograms, onProgramReady, startExport, reset } =
		usePdfExport();
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
		return {
			projectName: project.name,
			author: project.author || undefined,
			date: new Date().toLocaleDateString("fr-FR"),
			statement: project.exercise?.statement,
			stats: {
				grafcets: Object.keys(project.grafcets).length,
				ladders: Object.keys(project.ladders).length,
				variables: project.variables.length,
			},
		};
	}, [project, includeCover]);

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
		void startExport(programs, filename || "export", buildCover());
	}, [
		format,
		scope,
		project,
		activeProgram,
		grafcets,
		ladders,
		selectedIds,
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
			return Math.round((exportState.current / exportState.total) * 40);
		if (exportState.status === "capturing")
			return 40 + Math.round((exportState.current / exportState.total) * 55);
		if (exportState.status === "assembling") return 95;
		return 0;
	})();

	const progressLabel = (() => {
		if (exportState.status === "rendering")
			return `Rendu (${exportState.current}/${exportState.total}) — ${exportState.label}`;
		if (exportState.status === "capturing")
			return `Capture (${exportState.current}/${exportState.total}) — ${exportState.label}`;
		if (exportState.status === "assembling") return "Assemblage du PDF…";
		return "";
	})();

	return (
		<>
			{/* Rendu hors-écran des programmes — toujours monté quand l'export est en cours */}
			{offscreenPrograms.length > 0 && (
				<OffscreenProgramRenderer
					programs={offscreenPrograms}
					onProgramReady={onProgramReady}
				/>
			)}

			<CustomModal
				open={exportModalVisible}
				onClose={onClose}
				title="Exporter"
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
							label="PDF"
						/>
						<FormControlLabel
							value="json"
							control={<Radio size="small" disabled={isExporting} />}
							label="Fichier projet (JSON)"
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
									label="Projet complet"
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
											? `Page active uniquement (${activeProgram.program.name})`
											: "Page active uniquement"
									}
								/>
							</RadioGroup>
							{!activeProgram && (
								<Typography variant="caption" color="text.secondary">
									{"Ouvrez un grafcet ou un ladder pour l'exporter seul."}
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
										label="Inclure une page de garde"
									/>
									<Box>
										{grafcets.length > 0 && (
											<Typography
												variant="subtitle2"
												sx={{ mb: 0.5, fontWeight: 600 }}
											>
												GRAFCETs
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
												Ladders
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
												label={`${l.name} (paysage)`}
											/>
										))}
									</Box>
								</>
							)}
						</>
					)}

					<TextField
						label="Nom du fichier"
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
							Annuler
						</Button>
						<Button
							variant="contained"
							onClick={onExport}
							disabled={exportDisabled}
						>
							{isExporting ? "Export en cours…" : "Exporter"}
						</Button>
					</Box>
				</Box>
			</CustomModal>
		</>
	);
}
