"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { CircularProgress, Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../../projects/ProjectContext";

const UnsavedChangesIndicator = () => {
	const { hasUnsavedChanges, saveProject, savingProject } = useProjectStore(
		useShallow((state) => ({
			hasUnsavedChanges: state.hasUnsavedChanges,
			saveProject: state.saveProject,
			savingProject: state.savingProject,
		})),
	);
	return (
		<FlexBox>
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
						opacity: savingProject ? 0.5 : 1,
					}}
					onClick={async () => {
						if (savingProject) return;
						await saveProject();
					}}
				>
					Cliquez ici pour enregistrer
				</Typography>
			)}
			{savingProject && <CircularProgress size={15} />}
		</FlexBox>
	);
};

export default UnsavedChangesIndicator;
