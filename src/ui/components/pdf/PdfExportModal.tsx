"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import CustomModal from "@/ui/lib/mui/CustomModal";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	FormControlLabel,
	LinearProgress,
	TextField,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import OffscreenProgramRenderer from "./OffscreenProgramRenderer";
import { PdfExportProgramConfig, usePdfExport } from "./usePdfExport";

export default function PdfExportModal() {
	const { pdfExportModalVisible, setPdfExportModalVisible, project } = useProjectStore(
		useShallow((s) => ({
			pdfExportModalVisible: s.ui.pdfExportModalVisible,
			setPdfExportModalVisible: s.setPdfExportModalVisible,
			project: s.project,
		})),
	);

	const grafcets: Grafcet[] = project ? Object.values(project.grafcets) : [];
	const ladders: Ladder[] = project ? Object.values(project.ladders) : [];

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [filename, setFilename] = useState("");

	// Initialise la sélection et le nom quand la modale s'ouvre
	useEffect(() => {
		if (!pdfExportModalVisible) return;
		setSelectedIds(new Set([...grafcets.map((g) => g.id), ...ladders.map((l) => l.id)]));
		setFilename(project?.name ?? "export");
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pdfExportModalVisible]);

	const { exportState, offscreenPrograms, onProgramReady, startExport, reset } = usePdfExport();
	const isExporting = exportState.status !== "idle" && exportState.status !== "error";

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
		setPdfExportModalVisible(false);
	}, [isExporting, reset, setPdfExportModalVisible]);

	const onExport = useCallback(() => {
		const programs: PdfExportProgramConfig[] = [
			...grafcets
				.filter((g) => selectedIds.has(g.id))
				.map((g) => ({ type: "grafcet" as const, program: g })),
			...ladders
				.filter((l) => selectedIds.has(l.id))
				.map((l) => ({ type: "ladder" as const, program: l })),
		];
		void startExport(programs, filename || "export");
	}, [grafcets, ladders, selectedIds, filename, startExport]);

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
				open={pdfExportModalVisible}
				onClose={onClose}
				title="Exporter en PDF"
				width={480}
				closeButton={!isExporting}
			>
				<Box display="flex" flexDirection="column" gap={2}>
					{/* Sélection des programmes */}
					<Box>
						{grafcets.length > 0 && (
							<Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
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
							<Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
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

					{/* Nom de fichier */}
					<TextField
						label="Nom du fichier"
						value={filename}
						onChange={(e) => setFilename(e.target.value)}
						size="small"
						disabled={isExporting}
						fullWidth
					/>

					{/* Barre de progression */}
					{isExporting && (
						<Box>
							<LinearProgress variant="determinate" value={progressValue} sx={{ mb: 0.5 }} />
							<Typography variant="caption" color="text.secondary">
								{progressLabel}
							</Typography>
						</Box>
					)}

					{/* Erreur */}
					{exportState.status === "error" && (
						<Alert severity="error" onClose={reset}>
							{exportState.message}
						</Alert>
					)}

					{/* Actions */}
					<Box display="flex" justifyContent="flex-end" gap={1}>
						<Button onClick={onClose} disabled={isExporting} variant="outlined">
							Annuler
						</Button>
						<Button
							variant="contained"
							onClick={onExport}
							disabled={isExporting || selectedIds.size === 0}
						>
							{isExporting ? "Export en cours…" : "Exporter"}
						</Button>
					</Box>
				</Box>
			</CustomModal>
		</>
	);
}
