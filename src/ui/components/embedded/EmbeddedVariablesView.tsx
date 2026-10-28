"use client";

import { useT } from "@/ui/i18n/useT";
import {
	getVariablesPageDefinition,
	type VariablesPageId,
} from "@/ui/stores/project/variables-pages";
import { Box, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import Page from "../pages/Page";

//The data grid is a heavy library: it is loaded when the variables are first displayed.
const VariablesTable = dynamic(() => import("../variables/VariablesTable"), {
	ssr: false,
});

/** The table of one variables page of the application (inputs, outputs, memory or constants). */
export default function EmbeddedVariablesView({
	pageId,
}: {
	pageId: VariablesPageId;
}) {
	const t = useT("pages.titles");
	const definition = getVariablesPageDefinition(pageId);
	const title = t(definition.titleKey);

	return (
		<Page pageId={pageId}>
			<Box sx={{ width: "100%", height: "100%", overflowY: "auto", p: 2 }}>
				<Typography variant="h6" sx={{ mb: 1 }}>
					{title}
				</Typography>
				<VariablesTable zones={[...definition.zones]} pageTitle={title} />
			</Box>
		</Page>
	);
}
