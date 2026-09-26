"use client";

import { useT } from "@/ui/i18n/useT";
import MarkdownBody from "@/ui/lib/markdown-body";
import { PageData } from "@/ui/stores/project/project.store";
import { Box, Button, Typography } from "@mui/material";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";
import { PROJECT_PROPERTIES_PAGE_DATA } from "./ProjectPropertiesPage";

export const EXERCISE_PAGE_ID = "exercise";
export const EXERCISE_PAGE_DATA: PageData = {
	id: EXERCISE_PAGE_ID,
	type: "exercise",
	title: "Énoncé de l'exercice",
};

const ExercisePage = () => {
	const t = useT("pages.exercise");
	const statement = useProjectStore(
		(state) => state.project?.exercise?.statement ?? "",
	);
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<Page
			pageId={EXERCISE_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start", overflowY: "auto" }}
		>
			<Box sx={{ padding: "2rem 1rem", width: 800, maxWidth: "100%" }}>
				{statement ? (
					<MarkdownBody source={statement} />
				) : (
					<Box>
						<Typography variant="h2">{t("heading")}</Typography>
						<Typography sx={{ mt: 2, mb: 3 }} color="text.secondary">
							{t("empty")}
						</Typography>
						<Button
							variant="outlined"
							onClick={() => pagesManager.openPage(PROJECT_PROPERTIES_PAGE_DATA)}
						>
							{t("openProperties")}
						</Button>
					</Box>
				)}
			</Box>
		</Page>
	);
};

export default ExercisePage;
