"use client";

import { VariableZone } from "@/schemas/variable/variable.schema";
import {
	getVariablesPageDefinition,
	getVariablesPageDefinitionForZone,
	VariablesPageId,
} from "@/ui/stores/project/variables-pages";
import { PageData } from "@/ui/stores/project/project.store";
import { Box, Typography } from "@mui/material";
import VariablesTable from "../variables/VariablesTable";
import Page from "./Page";
import { usePageTitle } from "./usePageTitle";

export type VariablesPageData = Omit<PageData, "id"> & { id: VariablesPageId };

export function getVariablesPageIdForZone(zone: VariableZone): VariablesPageId {
	return getVariablesPageDefinitionForZone(zone).id;
}

const VariablesPage = ({ pageData }: { pageData: VariablesPageData }) => {
	const pageTitle = usePageTitle();
	const title = pageTitle({
		id: pageData.id,
		type: "variables",
		title: pageData.title,
	});
	const zones: VariableZone[] = [
		...getVariablesPageDefinition(pageData.id).zones,
	];

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
