"use client";

import { ProjectAnalyserIssueSeverity } from "@/project-analyser/project.analyser.issue";
import { AnalysisGrafcetIssues } from "@/ui/stores/project/managers/simulation/simulation.manager";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, List, ListItem, Paper, Typography } from "@mui/material";
import { useCallback } from "react";
import { useProjectStore } from "./ProjectContext";

function Header({ onClose }: { onClose: () => void }) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
			<Typography variant="h6">{"Résultats de l'analyse"}</Typography>
			<IconButton onClick={onClose} size="small" aria-label="close-analysis-errors">
				<CloseIcon />
			</IconButton>
		</Box>
	);
}

function IssueListItem({
	message,
	severity,
	onClick,
}: {
	message: string;
	severity: ProjectAnalyserIssueSeverity;
	onClick?: () => void;
}) {
	return (
		<ListItem
			sx={{
				display: "block",
				color: severity === "error" ? "red" : "darkorange",
				cursor: "pointer",
				"&:hover": { textDecoration: "underline" },
			}}
			onClick={onClick}
		>
			<Typography variant="body2">{message}</Typography>
		</ListItem>
	);
}

function GrafcetIssues({
	grafcetId,
	grafcetName,
	issues,
	severity,
	getGrafcetElement,
	onGoto,
}: {
	grafcetId: string;
	grafcetName: string;
	issues: AnalysisGrafcetIssues;
	severity: ProjectAnalyserIssueSeverity;
	getGrafcetElement: (grafcetId: string, elementId: string) => { getLabel: () => string } | null;
	onGoto: (grafcetId: string, elementId?: string) => void;
}) {
	return (
		<Box key={grafcetId}>
			{issues.overall && issues.overall.length > 0 && (
				<>
					<Typography variant="subtitle1">
						{severity === "error" ? "Erreurs globales" : "Avertissements globaux"}
					</Typography>
					<List dense>
						{issues.overall.map((msg: string, idx: number) => (
							<IssueListItem
								key={`g-${grafcetId}-${idx}`}
								message={`[${grafcetName}] ${msg}`}
								severity={severity}
								onClick={() => onGoto(grafcetId)}
							/>
						))}
					</List>
				</>
			)}

			{issues.elements && Object.keys(issues.elements).length > 0 && (
				<>
					<Typography variant="subtitle1">
						{severity === "error" ? "Erreurs éléments" : "Avertissements éléments"}
					</Typography>
					<List dense>
						{Object.entries(issues.elements).map(([elementId, msgs]) =>
							msgs.map((msg, idx) => (
								<IssueListItem
									key={`e-${grafcetId}-${elementId}-${idx}`}
									message={`[${getGrafcetElement(grafcetId, elementId)?.getLabel() || ""}] ${msg}`}
									severity={severity}
									onClick={() => onGoto(grafcetId, elementId)}
								/>
							)),
						)}
					</List>
				</>
			)}
		</Box>
	);
}

export default function AnalysisResult() {
	const analysisResultVisible = useProjectStore((s) => s.analysisResultVisible);
	const setAnalysisResultVisible = useProjectStore((s) => s.setAnalysisResultVisible);
	const analysisErrors = useProjectStore((s) => s.analysisErrors);
	const analysisWarnings = useProjectStore((s) => s.analysisWarnings);

	const grafcetsManager = useProjectStore((s) => s.grafcetsManager);
	const pagesManager = useProjectStore((s) => s.pagesManager);

	const getGrafcetName = useCallback(
		(grafcetId: string) => {
			const grafcet = grafcetsManager.getGrafcet(grafcetId);
			return grafcet ? grafcet.name : "Nom inconnu";
		},
		[grafcetsManager],
	);

	const getGrafcetElement = useCallback(
		(grafcetId: string, elementId: string) => {
			const grafcet = grafcetsManager.getGrafcet(grafcetId);
			if (!grafcet) return null;
			return grafcet.getElementById(elementId) || null;
		},
		[grafcetsManager],
	);

	const onClose = useCallback(() => {
		setAnalysisResultVisible(false);
	}, [setAnalysisResultVisible]);

	const onGoto = useCallback(
		(grafcetId: string, elementId?: string) => {
			pagesManager.openPage({
				type: "grafcet",
				id: grafcetId,
				title: getGrafcetName(grafcetId),
			});
		},
		[getGrafcetName, pagesManager],
	);

	if (!analysisResultVisible) return null;

	return (
		<Paper
			elevation={8}
			sx={{
				position: "fixed",
				left: 0,
				right: 0,
				height: 350,
				bottom: "30px",
				zIndex: 1400,
				m: 0,
				px: 2,
				py: 1,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Header onClose={onClose} />
			<Divider sx={{ my: 1 }} />
			<Box sx={{ overflow: "auto", flex: 1 }}>
				{(!analysisErrors || Object.keys(analysisErrors.grafcets).length === 0) && (
					<Typography sx={{ p: 2 }}>{"Aucune erreur lors de l'analyse."}</Typography>
				)}

				{analysisErrors && Object.keys(analysisErrors.grafcets).length > 0 && (
					<Box sx={{ px: 1, py: 1 }}>
						{Object.entries(analysisErrors.grafcets).map(([grafcetId, grafcetErrors]) => (
							<GrafcetIssues
								key={grafcetId}
								grafcetId={grafcetId}
								issues={grafcetErrors}
								severity="error"
								grafcetName={getGrafcetName(grafcetId)}
								getGrafcetElement={getGrafcetElement}
								onGoto={onGoto}
							/>
						))}
					</Box>
				)}
				<Divider sx={{ my: 1 }} />
				{(!analysisWarnings || Object.keys(analysisWarnings.grafcets).length === 0) && (
					<Typography sx={{ p: 2 }}>{"Aucun avertissement."}</Typography>
				)}

				{analysisWarnings && Object.keys(analysisWarnings.grafcets).length > 0 && (
					<Box sx={{ px: 1, py: 1 }}>
						{Object.entries(analysisWarnings.grafcets).map(([grafcetId, grafcetWarnings]) => (
							<GrafcetIssues
								key={grafcetId}
								grafcetId={grafcetId}
								issues={grafcetWarnings}
								severity="warning"
								grafcetName={getGrafcetName(grafcetId)}
								getGrafcetElement={getGrafcetElement}
								onGoto={onGoto}
							/>
						))}
					</Box>
				)}
			</Box>
		</Paper>
	);
}
