"use client";

import { Dialect } from "@/expression-language/dialect.enum";
import { useT } from "@/ui/i18n/useT";
import { Box } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";

export default function EmbeddedDialectSelect() {
	const t = useT("embedded.dialect");
	const { dialect, setProjectDialect } = useProjectStore(
		useShallow((state) => ({
			dialect: state.project?.dialect ?? Dialect.FR,
			setProjectDialect: state.setProjectDialect,
		})),
	);

	return (
		<Box
			component="label"
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				fontSize: "0.8rem",
			}}
		>
			{t("label")}
			<Box
				component="select"
				value={dialect}
				onChange={(e) => setProjectDialect(e.target.value as Dialect)}
				sx={{
					padding: "2px",
					borderRadius: "5px",
					fontSize: "0.8rem",
					cursor: "pointer",
					backgroundColor: "lightgray",
				}}
			>
				{Object.values(Dialect).map((value) => (
					<option key={value} value={value}>
						{t(value)}
					</option>
				))}
			</Box>
		</Box>
	);
}
