"use client";

import SaveIcon from "@mui/icons-material/SaveOutlined";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import { useProjectStore } from "../projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import AppTool from "./AppTool";

const SaveTool = () => {
	const t = useT("chrome.toolbar");
	const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
	const isSharedProject = useProjectStore((state) => state.isSharedProject);
	const lifecycleManager = useProjectStore((state) => state.lifecycleManager);

	if (isSharedProject) {
		return (
			<AppTool
				name="save-as"
				label={t("saveCopy")}
				onClick={() => void lifecycleManager.saveProject()}
			>
				<SaveAsIcon />
			</AppTool>
		);
	}

	return (
		<AppTool
			name="save"
			label={t("save")}
			disabled={!hasUnsavedChanges}
			onClick={() => void lifecycleManager.saveProject()}
		>
			<SaveIcon />
		</AppTool>
	);
};

export default SaveTool;
