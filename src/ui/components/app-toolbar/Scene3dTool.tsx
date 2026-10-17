"use client";

import ViewInArIcon from "@mui/icons-material/ViewInAr";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const Scene3dTool = () => {
	const t = useT("chrome.toolbar");
	const hasScene = useProjectStore((state) => !!state.project?.scene3d);
	const scene3dLinkManager = useProjectStore(
		(state) => state.scene3dLinkManager,
	);

	if (!hasScene) return null;
	return (
		<AppTool
			name="scene3d"
			label={t("scene3d")}
			onClick={() => scene3dLinkManager.open()}
		>
			<ViewInArIcon />
		</AppTool>
	);
};

export default Scene3dTool;
