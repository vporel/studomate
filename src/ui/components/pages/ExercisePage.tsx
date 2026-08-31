"use client";

import renderMarkdown from "@/ui/lib/markdown";
import { PageData } from "@/ui/stores/project/project.store";
import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
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
	const statement = useProjectStore(
		(state) => state.project?.exercise?.statement ?? "",
	);
	const pagesManager = useProjectStore((state) => state.pagesManager);

	const [html, setHtml] = useState<string>("");

	useEffect(() => {
		if (!statement) {
			setHtml("");
			return;
		}
		let cancelled = false;
		void renderMarkdown(statement).then((rendered) => {
			if (!cancelled) setHtml(rendered);
		});
		return () => {
			cancelled = true;
		};
	}, [statement]);

	return (
		<Page
			pageId={EXERCISE_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start", overflowY: "auto" }}
		>
			<Box sx={{ padding: "2rem 1rem", width: 800, maxWidth: "100%" }}>
				{statement ? (
					<Box
						className="markdown-body"
						sx={{
							"& h1, & h2, & h3": { mt: 3, mb: 1.5 },
							"& h1:first-of-type, & h2:first-of-type, & h3:first-of-type": {
								mt: 0,
							},
							"& p": { my: 1, lineHeight: 1.7 },
							"& ul, & ol": { pl: 3, my: 1 },
							"& li": { my: 0.5 },
							"& code": {
								backgroundColor: "rgba(0, 0, 0, 0.06)",
								borderRadius: "4px",
								px: "4px",
								fontSize: "0.9em",
							},
							"& pre": {
								backgroundColor: "rgba(0, 0, 0, 0.06)",
								borderRadius: "6px",
								p: 1.5,
								overflowX: "auto",
							},
							"& pre code": { backgroundColor: "transparent", px: 0 },
							"& table": { borderCollapse: "collapse", my: 1 },
							"& th, & td": {
								border: "1px solid rgba(0, 0, 0, 0.2)",
								padding: "4px 8px",
							},
							"& a": { color: "primary.main" },
						}}
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : (
					<Box>
						<Typography variant="h2">Énoncé de l&apos;exercice</Typography>
						<Typography sx={{ mt: 2, mb: 3 }} color="text.secondary">
							Ce projet n&apos;a pas encore d&apos;énoncé. L&apos;énoncé se rédige
							dans les propriétés du projet.
						</Typography>
						<Button
							variant="outlined"
							onClick={() => pagesManager.openPage(PROJECT_PROPERTIES_PAGE_DATA)}
						>
							Ouvrir les propriétés du projet
						</Button>
					</Box>
				)}
			</Box>
		</Page>
	);
};

export default ExercisePage;
