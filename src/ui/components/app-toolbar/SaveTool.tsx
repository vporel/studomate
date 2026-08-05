"use client";

import { SaveOutlined as SaveIcon } from "@mui/icons-material";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const SaveTool = () => {
	const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
	const saveProject = useProjectStore((state) => state.saveProject);

	return (
		<AppTool name="save" disabled={!hasUnsavedChanges} onClick={() => void saveProject()}>
			<SaveIcon />
		</AppTool>
	);
};

export default SaveTool;
