"use client";

import { Undo as UndoIcon } from "@mui/icons-material";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const UndoTool = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const hasActiveGrafcetCommandsToUndo = useProjectStore(
		(state) => state.getActiveGrafcetStoreValues()?.hasCommandsToUndo,
	);

	return (
		<AppTool
			name="undo"
			disabled={activeScopeType !== "grafcet" || !hasActiveGrafcetCommandsToUndo}
			onClick={() => {
				const actions = getActiveGrafcetStoreActions();
				actions?.undoOperation();
			}}
		>
			<UndoIcon />
		</AppTool>
	);
};

export default UndoTool;
