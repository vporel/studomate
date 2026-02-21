"use client";

import { Undo as UndoIcon } from "@mui/icons-material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const UndoTool = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const { projectCommandsStackManager, hasProjectCommandsToUndo, hasActiveGrafcetCommandsToUndo } =
		useProjectStore(
			useShallow((state) => ({
				projectCommandsStackManager: state.commandsStackManager,
				hasProjectCommandsToUndo: state.hasCommandsToUndo,
				hasActiveGrafcetCommandsToUndo: state.getActiveGrafcetStoreValues()?.hasCommandsToUndo,
			})),
		);

	return (
		<AppTool
			name="undo"
			disabled={
				(activeScopeType === "grafcet" && !hasActiveGrafcetCommandsToUndo) ||
				(activeScopeType === "project" && !hasProjectCommandsToUndo)
			}
			onClick={() => {
				if (activeScopeType === "grafcet") {
					const actions = getActiveGrafcetStoreActions();
					actions?.undoOperation();
				} else if (activeScopeType === "project") {
					projectCommandsStackManager.undoOperation();
				}
			}}
		>
			<UndoIcon />
		</AppTool>
	);
};

export default UndoTool;
