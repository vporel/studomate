"use client";

import { AnalysisGrafcetErrors } from "@/stores/project/managers/simulation/Analyser.class";
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

function GrafcetSection({
	grafcetId,
	grafcetErrors,
	grafcetName,
	getGrafcetElement,
	onGoto,
}: {
	grafcetId: string;
	grafcetErrors: AnalysisGrafcetErrors;
	grafcetName: string;
	getGrafcetElement: (grafcetId: string, elementId: string) => { getLabel: () => string } | null;
	onGoto: (grafcetId: string, elementId: string) => void;
}) {
	return (
		<Box key={grafcetId} sx={{ mb: 2 }}>
			{grafcetErrors.global && grafcetErrors.global.length > 0 && (
				<>
					<Typography variant="subtitle1">{`Erreurs globales — ${grafcetName}`}</Typography>
					<List dense>
						{grafcetErrors.global.map((msg: string, idx: number) => (
							<ListItem key={`g-${grafcetId}-${idx}`} sx={{ display: "block" }}>
								<Typography variant="body2">
									[{grafcetName}] {msg}
								</Typography>
							</ListItem>
						))}
					</List>
				</>
			)}

			{grafcetErrors.elements && Object.keys(grafcetErrors.elements).length > 0 && (
				<>
					<Typography variant="subtitle1">{`Erreurs éléments — ${grafcetName}`}</Typography>
					<List dense>
						{Object.entries(grafcetErrors.elements).map(([elementId, msgs]) =>
							msgs.map((msg, idx) => (
								<ListItem
									key={`e-${grafcetId}-${elementId}-${idx}`}
									sx={{
										display: "block",
										color: "red",
										cursor: "pointer",
										"&:hover": { textDecoration: "underline" },
									}}
									onClick={() => onGoto(grafcetId, elementId)}
								>
									<Typography variant="body2">
										{`[Grafcet : ${grafcetName}] ${getGrafcetElement(grafcetId, elementId)?.getLabel() || ""} : ${msg}`}
									</Typography>
								</ListItem>
							)),
						)}
					</List>
				</>
			)}
		</Box>
	);
}

export default function AnalysisErrors() {
	const analysisErrorsVisible = useProjectStore((s) => s.analysisErrorsVisible);
	const setAnalysisErrorsVisible = useProjectStore((s) => s.setAnalysisErrorsVisible);
	const analysisErrors = useProjectStore((s) => s.analysisErrors);

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
		setAnalysisErrorsVisible(false);
	}, [setAnalysisErrorsVisible]);

	const onGoto = useCallback(
		(grafcetId: string, elementId: string) => {
			pagesManager.openPage({
				type: "grafcet",
				id: grafcetId,
				title: getGrafcetName(grafcetId),
			});
		},
		[getGrafcetName, pagesManager],
	);

	if (!analysisErrorsVisible) return null;

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
							<GrafcetSection
								key={grafcetId}
								grafcetId={grafcetId}
								grafcetErrors={grafcetErrors}
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
