"use client";

import { useCallback } from "react";
import { useProjectStore } from "../projects/ProjectContext";

/** The props that link an `InlineScene` to the editor of the project. */
export default function useInlineSceneLink() {
	const scene3dLinkManager = useProjectStore(
		(state) => state.scene3dLinkManager,
	);
	const openTransport = useCallback(
		() => scene3dLinkManager.openInline(),
		[scene3dLinkManager],
	);
	const onDisconnect = useCallback(
		() => scene3dLinkManager.releaseInline(),
		[scene3dLinkManager],
	);
	return { openTransport, onDisconnect };
}
