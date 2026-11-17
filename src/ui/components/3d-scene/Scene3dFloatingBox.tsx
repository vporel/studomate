"use client";

import { useRef } from "react";
import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import {
	getScene3dFloatingFrame,
	setScene3dFloatingFrame,
} from "@/persistence/preferences.storage";
import { useT } from "@/ui/i18n/useT";
import FloatingBox, {
	type FloatingBoxPosition,
	type FloatingBoxSize,
} from "@/ui/lib/boxes/FloatingBox";
import { useProjectStore } from "../projects/ProjectContext";
import InlineScene from "./InlineScene";
import Scene3dModeButtons, { useOtherScene3dModes } from "./Scene3dModeButtons";
import useInlineSceneLink from "./useInlineSceneLink";

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 320;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 180;
/** Just under the toolbar. */
const TOP_OFFSET = 46;

/**
 * The 3D scene in a frame over the editors, which the user moves and resizes. It is linked to
 * the editor, and its WebGL context created, only while it is shown.
 */
export default function Scene3dFloatingBox() {
	const t = useT("scene3d.view");
	const visible = useProjectStore(
		(state) => state.ui.scene3dFloatingVisible && !!state.project?.scene3d,
	);
	const scene3dDisplayManager = useProjectStore(
		(state) => state.scene3dDisplayManager,
	);
	const link = useInlineSceneLink();
	const otherModes = useOtherScene3dModes(Scene3dDisplayMode.FLOATING_BOX);
	const frame = useRef<{
		position: FloatingBoxPosition | null;
		size: FloatingBoxSize | null;
	} | null>(null);

	if (!visible) {
		frame.current = null;
		return null;
	}
	frame.current ??= (() => {
		const stored = getScene3dFloatingFrame();
		return {
			position: stored && { x: stored.x, y: stored.y },
			size: stored && { width: stored.width, height: stored.height },
		};
	})();
	const remember = (
		next: Partial<{
			position: FloatingBoxPosition;
			size: FloatingBoxSize;
		}>,
	) => {
		const current = { ...frame.current!, ...next };
		frame.current = current;
		if (current.position && current.size) {
			setScene3dFloatingFrame({ ...current.position, ...current.size });
		}
	};

	return (
		<FloatingBox
			title={t("title")}
			closeLabel={t("close")}
			position={frame.current.position}
			onPositionChange={(position) => remember({ position })}
			size={frame.current.size}
			onSizeChange={(size) => remember({ size })}
			onClose={() => scene3dDisplayManager.close()}
			resizable
			width={DEFAULT_WIDTH}
			height={DEFAULT_HEIGHT}
			minWidth={MIN_WIDTH}
			minHeight={MIN_HEIGHT}
			top={TOP_OFFSET}
			actions={<Scene3dModeButtons modes={otherModes} sx={{ p: 0.25 }} />}
		>
			<InlineScene {...link} foldPanels />
		</FloatingBox>
	);
}
