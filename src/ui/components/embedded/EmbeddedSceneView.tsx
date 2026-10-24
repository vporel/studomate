"use client";

import { useCallback } from "react";
import InlineScene from "../3d-scene/InlineScene";
import Page from "../pages/Page";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * The 3D scene of the project. It is linked to the editor, and its WebGL context created, only
 * while its tab is displayed.
 */
export default function EmbeddedSceneView({ pageId }: { pageId: string }) {
	const scene3dLinkManager = useProjectStore(
		(state) => state.scene3dLinkManager,
	);
	const active = useProjectStore((state) => state.activePageId === pageId);
	const openTransport = useCallback(
		() => scene3dLinkManager.openInline(),
		[scene3dLinkManager],
	);
	const disconnect = useCallback(
		() => scene3dLinkManager.close(),
		[scene3dLinkManager],
	);

	return (
		<Page pageId={pageId} sx={{ position: "relative" }}>
			{active && (
				<InlineScene openTransport={openTransport} onDisconnect={disconnect} />
			)}
		</Page>
	);
}
