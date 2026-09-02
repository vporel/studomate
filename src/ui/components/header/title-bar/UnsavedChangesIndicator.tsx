"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import { CircularProgress, Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";

const UnsavedChangesIndicator = () => {
	const t = useT("chrome");
	const { hasUnsavedChanges, lifecycleManager, savingProject } = useProjectStore(
		useShallow((state) => ({
			hasUnsavedChanges: state.hasUnsavedChanges,
			lifecycleManager: state.lifecycleManager,
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
					onClick={() => {
						if (savingProject) return;
						void lifecycleManager.saveProject();
					}}
				>
					{t("unsavedChanges")}
				</Typography>
			)}
			{savingProject && <CircularProgress size={15} />}
		</FlexBox>
	);
};

export default UnsavedChangesIndicator;
