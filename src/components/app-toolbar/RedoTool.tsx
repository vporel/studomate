"use client";

import { Redo as RedoIcon } from "@mui/icons-material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const RedoTool = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const { projectCommandsStackManager, hasProjectCommandsToRedo, hasActiveGrafcetCommandsToRedo } =
		useProjectStore(
			useShallow((state) => ({
				projectCommandsStackManager: state.commandsStackManager,
				hasProjectCommandsToRedo: state.hasCommandsToRedo,
				hasActiveGrafcetCommandsToRedo: state.getActiveGrafcetStoreValues()?.hasCommandsToRedo,
			})),
		);
	return (
		<AppTool
			name="redo"
			disabled={
				(activeScopeType === "grafcet" && !hasActiveGrafcetCommandsToRedo) ||
				(activeScopeType === "project" && !hasProjectCommandsToRedo)
			}
			onClick={() => {
				if (activeScopeType === "grafcet") {
					const actions = getActiveGrafcetStoreActions();
					actions?.redoOperation();
				} else if (activeScopeType === "project") {
					projectCommandsStackManager.redoOperation();
				}
			}}
		>
			<RedoIcon />
		</AppTool>
	);
};

export default RedoTool;
