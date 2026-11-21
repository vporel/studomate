"use client";

import {
	setEditorTourSeen,
	type EditorTourKind,
} from "@/persistence/preferences.storage";
import useCanEdit from "@/ui/components/projects/useCanEdit";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useAutoStartTour from "@/ui/components/product-tour/engine/useAutoStartTour";
import useStartTour from "@/ui/components/product-tour/engine/useStartTour";
import { useCallback } from "react";
import { shouldStartEditorTour } from "@/ui/components/product-tour/engine/tour-eligibility";
import EDITOR_TOUR_STEP_BUILDERS, {
	isEditorTourKind,
} from "./editor-tour-step-builders";

const EditorTourRunner = ({
	kind,
	pageId,
}: {
	kind: EditorTourKind;
	pageId: string;
}) => {
	const markSeen = useCallback(() => setEditorTourSeen(kind), [kind]);
	const startTour = useStartTour(EDITOR_TOUR_STEP_BUILDERS[kind], markSeen);

	const start = useCallback(
		() => startTour(`[id="page-${pageId}"]`),
		[startTour, pageId],
	);
	const isEligible = useCallback(() => shouldStartEditorTour(kind), [kind]);
	useAutoStartTour(start, isEligible);

	return null;
};

/** Shows the tour of the active editor page the first time it is opened in design mode. */
const EditorTour = () => {
	const activePageId = useProjectStore((state) => state.activePageId);
	const pageType = useProjectStore((state) =>
		state.activePageId ? state.pagesData[state.activePageId]?.type : undefined,
	);
	const canEdit = useCanEdit();

	if (!activePageId || !canEdit || !isEditorTourKind(pageType)) return null;
	return (
		<EditorTourRunner
			key={activePageId}
			kind={pageType}
			pageId={activePageId}
		/>
	);
};

export default EditorTour;
