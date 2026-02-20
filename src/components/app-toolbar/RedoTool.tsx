"use client";

import { Redo as RedoIcon } from "@mui/icons-material";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const RedoTool = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const hasActiveGrafcetCommandsToRedo = useProjectStore(
		(state) => state.getActiveGrafcetStoreValues()?.hasCommandsToRedo,
	);
	return (
		<AppTool
			name="redo"
			disabled={activeScopeType !== "grafcet" || !hasActiveGrafcetCommandsToRedo}
			onClick={() => {
				const actions = getActiveGrafcetStoreActions();
				actions?.redoOperation();
			}}
		>
			<RedoIcon />
		</AppTool>
	);
};

export default RedoTool;
