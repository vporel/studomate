"use client";

import Variable, { VariableZone } from "@/schemas/variable/Variable.class";
import { PageData } from "@/stores/project/project-store-types";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import VariablesTable from "../variables/VariablesTable";
import Page from "./Page";

export type VariablesPageId = "input-variables" | "output-variables" | "memory-variables";

export type VariablesPageData = Omit<PageData, "id"> & { id: VariablesPageId };

const VARIABLES_PAGES_TITLES: Record<VariablesPageId, string> = {
	"input-variables": "Variables d'entrée",
	"output-variables": "Variables de sortie",
	"memory-variables": "Variables de mémoire",
};

export function getVariablesPageData(pageId: VariablesPageId): PageData {
	return {
		id: pageId,
		type: "variables",
		title: VARIABLES_PAGES_TITLES[pageId],
	};
}

const VariablesPage = ({ pageData }: { pageData: VariablesPageData }) => {
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
		<Page pageId={pageData.id} sx={{ justifyContent: "center", alignItems: "start" }}>
			<Box
				sx={{
					padding: "3rem 3rem",
					width: "100%",
				}}
			>
				<Typography variant="h3" sx={{ mb: 1 }}>
					{pageData.title}
				</Typography>
				<Typography variant="body1" sx={{ mb: 3 }}>
					Types valides dans ce contexte : {Variable.getValidTypesForZones(zones).join(", ")}
				</Typography>
				<VariablesTable zones={zones} />
			</Box>
		</Page>
	);
};

export default VariablesPage;
