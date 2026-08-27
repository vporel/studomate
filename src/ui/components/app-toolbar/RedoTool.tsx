"use client";

import { canRedoActiveScope } from "@/ui/stores/project/undo-redo";
import RedoIcon from "@mui/icons-material/Redo";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const RedoTool = () => {
	const canRedo = useProjectStore(canRedoActiveScope);
	const redo = useProjectStore((state) => state.redoActiveScope);

	return (
		<AppTool name="redo" disabled={!canRedo} onClick={redo}>
			<RedoIcon />
		</AppTool>
	);
};

export default RedoTool;
