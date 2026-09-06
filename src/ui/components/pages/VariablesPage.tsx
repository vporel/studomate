"use client";

import { VariableZone } from "@/schemas/variable/variable.schema";
import { PageData } from "@/ui/stores/project/project.store";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import VariablesTable from "../variables/VariablesTable";
import Page from "./Page";
import { usePageTitle } from "./usePageTitle";

export type VariablesPageId =
	"input-variables" | "output-variables" | "memory-variables";

export type VariablesPageData = Omit<PageData, "id"> & { id: VariablesPageId };

const VARIABLES_PAGES_TITLES: Record<VariablesPageId, string> = {
	"input-variables": "Variables d'entrée",
	"output-variables": "Variables de sortie",
	"memory-variables": "Variables de mémoire",
};

export function getVariablesPageIdForZone(
	zone: VariableZone,
): VariablesPageId {
	if (zone.includes("input")) return "input-variables";
	if (zone.includes("output")) return "output-variables";
	return "memory-variables";
}

export function getVariablesPageData(pageId: VariablesPageId): PageData {
	return {
		id: pageId,
		type: "variables",
		title: VARIABLES_PAGES_TITLES[pageId],
	};
}

const VariablesPage = ({ pageData }: { pageData: VariablesPageData }) => {
	const pageTitle = usePageTitle();
	const title = pageTitle({
		id: pageData.id,
		type: "variables",
		title: pageData.title,
	});
	const zones: VariableZone[] = useMemo(() => {
		switch (pageData.id) {
			case "input-variables":
				return ["logic-input", "analog-input"];
			case "output-variables":
				return ["logic-output", "analog-output"];
			case "memory-variables":
				return ["memory"];
		}
	}, [pageData.id]);

	return (
		<Page
			pageId={pageData.id}
			sx={{ justifyContent: "center", alignItems: "start" }}
		>
			<Box
				sx={{
					padding: "3rem 3rem",
					width: "100%",
					height: "100%",
					overflowY: "auto",
				}}
			>
				<Typography variant="h3" sx={{ mb: 3 }}>
					{title}
				</Typography>
				<VariablesTable zones={zones} pageTitle={title} />
			</Box>
		</Page>
	);
};

export default VariablesPage;
