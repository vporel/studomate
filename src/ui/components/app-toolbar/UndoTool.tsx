"use client";

import { canUndoActiveScope } from "@/ui/stores/project/undo-redo";
import UndoIcon from "@mui/icons-material/Undo";
import { useProjectStore } from "../projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import AppTool from "./AppTool";

const UndoTool = () => {
	const t = useT("chrome.toolbar");
	const canUndo = useProjectStore(canUndoActiveScope);
	const undo = useProjectStore((state) => state.undoActiveScope);

	return (
		<AppTool name="undo" label={t("undo")} disabled={!canUndo} onClick={undo}>
			<UndoIcon />
		</AppTool>
	);
};

export default UndoTool;
