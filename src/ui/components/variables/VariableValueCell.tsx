"use client";

import { Dialect } from "@/expression-language/dialect.enum";
import { formatVariableValue } from "@/ui/components/variables/format-variable-value";
import { Typography } from "@mui/material";
import { useProjectStore } from "../projects/ProjectContext";

/** Current simulation value of a variable, read-only. Subscribed per cell so that a cycle only
 * re-renders the cells whose value changed. */
export default function VariableValueCell({ variableId }: { variableId: string }) {
	const dialect = useProjectStore((s) => s.project?.dialect ?? Dialect.FR);
	const variable = useProjectStore((s) =>
		s.project?.variables.find((v) => v.id === variableId),
	);
	const value = useProjectStore(
		(s) => s.simulationVariablesStates[variableId]?.value,
	);
	if (!variable) return null;

	const formatted = formatVariableValue(variable, value, dialect);
	if (formatted === undefined)
		return (
			<Typography variant="body2" component="span" color="text.secondary">
				-
			</Typography>
		);
	const inactive = value === false || value === 0;
	return (
		<Typography
			variant="body2"
			component="span"
			data-inactive={inactive}
			sx={{
				px: 1,
				py: 0.25,
				borderRadius: 1,
				bgcolor: inactive ? "action.disabledBackground" : "primary.main",
				color: inactive ? "text.primary" : "primary.contrastText",
				fontWeight: 500,
				lineHeight: 1.4,
			}}
		>
			{formatted}
		</Typography>
	);
}
