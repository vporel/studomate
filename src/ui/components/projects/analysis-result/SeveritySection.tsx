import { AnalysisIssues } from "@/bridge/analysis-issues.mapper";
import { useT } from "@/ui/i18n/useT";
import { Box, List, Typography } from "@mui/material";
import ProgramIssues, { IssueListItem } from "./ProgramIssues";

export default function SeveritySection({
	title,
	severity,
	issues,
	hasProgramIssues,
	getGrafcetName,
	getGrafcetElementLabel,
	getLadderName,
	getLadderElementLabel,
	onGotoProgram,
}: {
	title: string;
	severity: "error" | "warning";
	issues: AnalysisIssues;
	hasProgramIssues: boolean;
	getGrafcetName: (id: string) => string;
	getGrafcetElementLabel: (id: string, elId: string) => string;
	getLadderName: (id: string) => string;
	getLadderElementLabel: (id: string, elId: string) => string;
	onGotoProgram: (
		progId: string,
		progType: "grafcet" | "ladder",
		elId?: string,
	) => void;
}) {
	const t = useT("projects.analysisResult");
	const isError = severity === "error";
	return (
		<>
			<Typography variant="h5">{">> " + title}</Typography>
			{!hasProgramIssues && issues.project.length === 0 && (
				<Typography sx={{ p: 2 }}>
					{isError ? t("noErrors") : t("noWarnings")}
				</Typography>
			)}
			{issues.project.length > 0 && (
				<>
					<Typography variant="subtitle2" sx={{ ml: 2 }}>
						{isError ? t("projectErrors") : t("projectWarnings")}
					</Typography>
					<List dense sx={{ ml: 2 }}>
						{issues.project.map((msg: string, idx: number) => (
							<IssueListItem
								key={`p-${idx}`}
								message={msg}
								severity={severity}
							/>
						))}
					</List>
				</>
			)}
			{Object.keys(issues.grafcets).length > 0 && (
				<Box sx={{ px: 1, py: 1 }}>
					{Object.entries(issues.grafcets).map(([grafcetId, progIssues]) => (
						<ProgramIssues
							key={grafcetId}
							programKind={t("grafcetKind")}
							programId={grafcetId}
							programName={getGrafcetName(grafcetId)}
							issues={progIssues}
							severity={severity}
							getElementLabel={(elementId) =>
								getGrafcetElementLabel(grafcetId, elementId)
							}
							onGoto={(elementId) =>
								onGotoProgram(grafcetId, "grafcet", elementId)
							}
						/>
					))}
				</Box>
			)}
			{Object.keys(issues.ladders).length > 0 && (
				<Box sx={{ px: 1, py: 1 }}>
					{Object.entries(issues.ladders).map(([ladderId, progIssues]) => (
						<ProgramIssues
							key={ladderId}
							programKind={t("ladderKind")}
							programId={ladderId}
							programName={getLadderName(ladderId)}
							issues={progIssues}
							severity={severity}
							getElementLabel={(elementId) =>
								getLadderElementLabel(ladderId, elementId)
							}
							onGoto={(elementId) =>
								onGotoProgram(ladderId, "ladder", elementId)
							}
						/>
					))}
				</Box>
			)}
		</>
	);
}
