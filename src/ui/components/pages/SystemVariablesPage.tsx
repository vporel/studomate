"use client";

import { SYSTEM_VARIABLES } from "@/schemas/variable/system-variables";
import { useT } from "@/ui/i18n/useT";
import { PageData } from "@/ui/stores/project/project.store";
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import Page from "./Page";
import { usePageTitle } from "./usePageTitle";

export const SYSTEM_VARIABLES_PAGE_ID = "system-variables";
export const SYSTEM_VARIABLES_PAGE_DATA: PageData = {
	id: SYSTEM_VARIABLES_PAGE_ID,
	type: "system-variables",
	title: "Variables système",
};

const SystemVariablesPage = () => {
	const t = useT("pages.systemVariables");
	const pageTitle = usePageTitle();

	return (
		<Page
			pageId={SYSTEM_VARIABLES_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start" }}
		>
			<Box sx={{ padding: "3rem 3rem", width: "100%", maxWidth: 900 }}>
				<Typography variant="h3" sx={{ mb: 2 }}>
					{pageTitle({
						id: SYSTEM_VARIABLES_PAGE_ID,
						type: "system-variables",
						title: SYSTEM_VARIABLES_PAGE_DATA.title,
					})}
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
					{t("intro")}
				</Typography>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>{t("columns.name")}</TableCell>
							<TableCell>{t("columns.type")}</TableCell>
							<TableCell>{t("columns.description")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{SYSTEM_VARIABLES.map((variable) => (
							<TableRow key={variable.name}>
								<TableCell sx={{ fontFamily: "monospace" }}>
									{variable.name}
								</TableCell>
								<TableCell>{variable.type}</TableCell>
								<TableCell>{t(`items.${variable.name}` as never)}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Box>
		</Page>
	);
};

export default SystemVariablesPage;
