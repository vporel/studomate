import { AnalysisProgramIssues } from "@/bridge/analysis-issues.mapper";
import { ProjectAnalyserIssueSeverity } from "@/project-analyser/project.analyser.issue";
import { Box, List, ListItem, Typography } from "@mui/material";

export function IssueListItem({
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
				cursor: onClick ? "pointer" : "default",
				"&:hover": onClick ? { textDecoration: "underline" } : undefined,
			}}
			onClick={onClick}
		>
			<Typography variant="body2">{message}</Typography>
		</ListItem>
	);
}

/** Un bloc de problèmes pour un programme (GRAFCET ou Ladder) — la nature exacte du programme
 * n'a pas d'importance ici, seulement son nom et la façon de nommer/atteindre ses éléments. */
export default function ProgramIssues({
	programKind,
	programId,
	programName,
	issues,
	severity,
	getElementLabel,
	onGoto,
}: {
	programKind: string;
	programId: string;
	programName: string;
	issues: AnalysisProgramIssues;
	severity: ProjectAnalyserIssueSeverity;
	getElementLabel: (elementId: string) => string;
	onGoto: (elementId?: string) => void;
}) {
	if (!issues.overall && (!issues.elements || Object.keys(issues.elements).length === 0)) {
		return null;
	}
	const programKindLower = programKind.toLowerCase();
	return (
		<Box key={programId}>
			<Typography variant="h6">{`${programKind} : ${programName}`}</Typography>
			{issues.overall && issues.overall.length > 0 && (
				<>
					<Typography variant="subtitle2" sx={{ ml: 2 }}>
						{severity === "error"
							? `Erreurs globales au ${programKindLower}`
							: `Avertissements globaux au ${programKindLower}`}
					</Typography>
					<List dense sx={{ ml: 2 }}>
						{issues.overall.map((msg: string, idx: number) => (
							<IssueListItem
								key={`g-${programId}-${idx}`}
								message={msg}
								severity={severity}
								onClick={() => onGoto()}
							/>
						))}
					</List>
				</>
			)}

			{issues.elements && Object.keys(issues.elements).length > 0 && (
				<>
					<Typography variant="subtitle2" sx={{ ml: 2 }}>
						{severity === "error"
							? `Erreurs des éléments du ${programKindLower}`
							: `Avertissements des éléments du ${programKindLower}`}
					</Typography>
					<List dense sx={{ ml: 2 }}>
						{Object.entries(issues.elements).map(([elementId, msgs]) =>
							msgs.map((msg, idx) => (
								<IssueListItem
									key={`e-${programId}-${elementId}-${idx}`}
									message={`[${getElementLabel(elementId)}] ${msg}`}
									severity={severity}
									onClick={() => onGoto(elementId)}
								/>
							)),
						)}
					</List>
				</>
			)}
		</Box>
	);
}
