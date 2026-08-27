"use client";

import SaveIcon from "@mui/icons-material/SaveOutlined";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const SaveTool = () => {
	const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
	const isSharedProject = useProjectStore((state) => state.isSharedProject);
	const saveProject = useProjectStore((state) => state.saveProject);

	if (isSharedProject) {
		return (
			<AppTool
				name="save-as"
				label="Enregistrer une copie"
				onClick={() => void saveProject()}
			>
				<SaveAsIcon />
			</AppTool>
		);
	}

	return (
		<AppTool
			name="save"
			label="Enregistrer"
			disabled={!hasUnsavedChanges}
			onClick={() => void saveProject()}
		>
			<SaveIcon />
		</AppTool>
	);
};

export default SaveTool;
