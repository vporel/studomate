"use client";

import type { Locale } from "@/i18n/config";
import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import TrainingEmbeddedBlock, {
	type TrainingInitialView,
} from "./TrainingEmbeddedBlock";

type View = "exercise" | "solution";

/**
 * The exercise of a template, editable in the page, and its solution in a second tab. Both stay
 * mounted once shown, so looking at the solution never discards the student's work.
 */
export default function TrainingExerciseBlock({
	templateId,
	locale,
	exerciseTab,
	solutionTab,
	initialView,
	watchOpen,
}: {
	templateId: string;
	locale: Locale;
	exerciseTab?: string;
	/** Without a solution tab, the exercise is shown alone. */
	solutionTab?: string;
	initialView?: TrainingInitialView;
	/** The watch table is open when the solution starts. */
	watchOpen?: boolean;
}) {
	const [view, setView] = useState<View>("exercise");
	const [solutionShown, setSolutionShown] = useState(false);

	const select = (next: View) => {
		if (next === "solution") setSolutionShown(true);
		setView(next);
	};

	if (!exerciseTab || !solutionTab) {
		return (
			<TrainingEmbeddedBlock
				templateId={templateId}
				locale={locale}
				variant="exercise"
				initialView={initialView}
			/>
		);
	}

	return (
		<>
			<Tabs
				value={view}
				onChange={(_, next: View) => select(next)}
				sx={{ mb: 1 }}
			>
				<Tab value="exercise" label={exerciseTab} />
				<Tab value="solution" label={solutionTab} />
			</Tabs>
			<Box sx={{ display: view === "exercise" ? "block" : "none" }}>
				<TrainingEmbeddedBlock
					templateId={templateId}
					locale={locale}
					variant="exercise"
					initialView={initialView}
				/>
			</Box>
			{solutionShown && (
				<Box sx={{ display: view === "solution" ? "block" : "none" }}>
					<TrainingEmbeddedBlock
						templateId={templateId}
						locale={locale}
						watchOpen={watchOpen}
					/>
				</Box>
			)}
		</>
	);
}
