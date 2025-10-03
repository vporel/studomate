"use client";

import { Box, CircularProgress, Typography } from "@mui/material";
import { useState } from "react";
import { useProjectContext } from "../projects/ProjectContext";

const TitleBar = () => {
	const { project, hasUnsavedChanges, saveProject } = useProjectContext();
	const [saving, setSaving] = useState(false);

	return (
		<Box
			sx={{
				width: "100%",
				height: "25px",
				backgroundColor: "white",
				paddingLeft: "5px",
				display: "flex",
				alignItems: "center",
				gap: "10px",
			}}
		>
			<Typography variant="h6" fontSize="1.1rem">
				{project?.name}
			</Typography>
			{hasUnsavedChanges && (
				<Typography
					color="error"
					style={{
						background: "rgba(255, 100, 0, 0.2)",
						padding: "2px",
						borderRadius: "5px",
						fontSize: "0.8rem",
						cursor: "pointer",
						userSelect: "none",
						opacity: saving ? 0.5 : 1,
					}}
					onClick={async () => {
						if (saving) return;
						setSaving(true);
						await saveProject();
						setSaving(false);
					}}
				>
					Cliquez ici pour enregistrer.
				</Typography>
			)}
			{saving && <CircularProgress size={15} />}
		</Box>
	);
};

export default TitleBar;
