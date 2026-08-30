"use client";

import ResizableFixedBox from "@/ui/lib/mui/ResizableFixedBox";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import { useCallback } from "react";
import { useProjectStore } from "../ProjectContext";
import useGotoProgram from "../useGotoProgram";

function Header({ onClose }: { onClose: () => void }) {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<Typography variant="h6">{"Résultats de l'analyse"}</Typography>
			<Tooltip title="Fermer">
				<IconButton
					onClick={onClose}
					size="small"
					aria-label="close-analysis-errors"
				>
					<CloseIcon />
				</IconButton>
			</Tooltip>
		</Box>
	);
}

import SeveritySection from "./SeveritySection";

export default function AnalysisResult() {
	const analysisResultVisible = useProjectStore(
		(s) => s.ui.analysisResultVisible,
	);
	const setAnalysisResultVisible = useProjectStore(
		(s) => s.setAnalysisResultVisible,
	);
	const analysisErrors = useProjectStore((s) => s.analysisErrors);
	const analysisWarnings = useProjectStore((s) => s.analysisWarnings);

	const project = useProjectStore((s) => s.project);

	// `project.getGrafcet`/`getLadder` sont nullable (contrairement aux méthodes homonymes des
	// managers, qui lèvent) : un id de programme absent (grafcet supprimé entre-temps, etc.) ne
	// doit jamais faire planter le panneau, juste afficher "Nom inconnu".
	const getGrafcetName = useCallback(
		(grafcetId: string) =>
			project?.getGrafcet(grafcetId)?.name ?? "Nom inconnu",
		[project],
	);
	const getLadderName = useCallback(
		(ladderId: string) => project?.getLadder(ladderId)?.name ?? "Nom inconnu",
		[project],
	);

	const getGrafcetElementLabel = useCallback(
		(grafcetId: string, elementId: string) =>
			project?.getGrafcet(grafcetId)?.getElementById(elementId)?.getLabel() ??
			"",
		[project],
	);
	const getLadderElementLabel = useCallback(
		(ladderId: string, elementId: string) => {
			const located = project?.getLadder(ladderId)?.findElement(elementId);
			if (!located || located.element.type === "railTerminal") return "";
			if (located.element.type === "contact")
				return `Contact ${located.element.data.variable}`;
			if (located.element.type === "coil")
				return `Bobine ${located.element.data.variable}`;
			return "Bloc";
		},
		[project],
	);

	const onClose = () => {
		setAnalysisResultVisible(false);
	};

	const onGotoProgram = useGotoProgram();

	if (!analysisResultVisible) return null;

	const hasErrorProgramIssues =
		analysisErrors &&
		(Object.keys(analysisErrors.grafcets).length > 0 ||
			Object.keys(analysisErrors.ladders).length > 0);
	const hasWarningProgramIssues =
		analysisWarnings &&
		(Object.keys(analysisWarnings.grafcets).length > 0 ||
			Object.keys(analysisWarnings.ladders).length > 0);

	return (
		<ResizableFixedBox
			position="bottom"
			initialSize={350}
			offset={30}
			contentContainerProps={{
				sx: {
					px: 2,
					py: 1,
					display: "flex",
					flexDirection: "column",
				},
			}}
		>
			<Header onClose={onClose} />
			<Divider sx={{ my: 1 }} />
			<Box sx={{ overflow: "auto", flex: 1 }}>
				<SeveritySection
					title="Erreurs"
					severity="error"
					issues={analysisErrors}
					hasProgramIssues={hasErrorProgramIssues}
					getGrafcetName={getGrafcetName}
					getGrafcetElementLabel={getGrafcetElementLabel}
					getLadderName={getLadderName}
					getLadderElementLabel={getLadderElementLabel}
					onGotoProgram={onGotoProgram}
				/>

				<Divider sx={{ my: 1 }} />

				<SeveritySection
					title="Avertissements"
					severity="warning"
					issues={analysisWarnings}
					hasProgramIssues={hasWarningProgramIssues}
					getGrafcetName={getGrafcetName}
					getGrafcetElementLabel={getGrafcetElementLabel}
					getLadderName={getLadderName}
					getLadderElementLabel={getLadderElementLabel}
					onGotoProgram={onGotoProgram}
				/>
			</Box>
		</ResizableFixedBox>
	);
}
