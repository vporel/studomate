"use client";

import { Box, Divider } from "@mui/material";
import { useCallback } from "react";
import { useProjectStore } from "../ProjectContext";
import { useT } from "@/ui/i18n/useT";
import SeveritySection from "./SeveritySection";

export type GotoProgram = (
	programId: string,
	programType: "grafcet" | "ladder",
	elementId?: string,
) => void;

/** Errors and warnings of the last analysis, grouped by severity. */
export default function AnalysisResultSections({
	onGotoProgram,
}: {
	onGotoProgram: GotoProgram;
}) {
	const t = useT("projects.analysisResult");
	const analysisErrors = useProjectStore((s) => s.analysisErrors);
	const analysisWarnings = useProjectStore((s) => s.analysisWarnings);

	const project = useProjectStore((s) => s.project);

	// `project.getGrafcet`/`getLadder` sont nullable (contrairement aux méthodes homonymes des
	// managers, qui lèvent) : un id de programme absent (grafcet supprimé entre-temps, etc.) ne
	// doit jamais faire planter le panneau, juste afficher "Nom inconnu".
	const getGrafcetName = useCallback(
		(grafcetId: string) =>
			project?.getGrafcet(grafcetId)?.name ?? t("unknownName"),
		[project, t],
	);
	const getLadderName = useCallback(
		(ladderId: string) =>
			project?.getLadder(ladderId)?.name ?? t("unknownName"),
		[project, t],
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
				return t("contactLabel", { variable: located.element.data.variable });
			if (located.element.type === "coil")
				return t("coilLabel", { variable: located.element.data.variable });
			return t("blockLabel");
		},
		[project, t],
	);

	const hasErrorProgramIssues =
		analysisErrors &&
		(Object.keys(analysisErrors.grafcets).length > 0 ||
			Object.keys(analysisErrors.ladders).length > 0);
	const hasWarningProgramIssues =
		analysisWarnings &&
		(Object.keys(analysisWarnings.grafcets).length > 0 ||
			Object.keys(analysisWarnings.ladders).length > 0);

	return (
		<Box sx={{ overflow: "auto", flex: 1 }}>
			<SeveritySection
				title={t("errors")}
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
				title={t("warnings")}
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
	);
}
