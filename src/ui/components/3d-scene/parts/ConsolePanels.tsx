"use client";

import { useTranslations } from "next-intl";
import {
	Children,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import FloatingBox from "@/ui/lib/boxes/FloatingBox";
import { ConsolePanelIndexContext } from "./ScenePanelsContext";
import { PANEL_EDGE_MARGIN, panelsMaxHeight } from "./scene-panels-state";

const noop = () => {};

/**
 * The panels of a scene's controls, stacked in a single box that moves within the scene. The
 * panels are as wide as the box, and scroll in the box when the scene is too low for them.
 */
export default function ConsolePanels({
	width,
	children,
}: {
	/** Width of the box in px; it is as wide as its widest panel when not given. */
	width?: number;
	children: ReactNode;
}) {
	const t = useTranslations("scene3d.panels");
	const contentRef = useRef<HTMLDivElement>(null);
	const [maxHeight, setMaxHeight] = useState<number>();

	useLayoutEffect(() => {
		const content = contentRef.current;
		const box = content?.closest<HTMLElement>('[role="dialog"]');
		const parent = box?.offsetParent;
		if (!content || !box || !parent) return;
		const fit = () =>
			setMaxHeight(
				panelsMaxHeight(
					parent.clientHeight,
					box.offsetHeight - content.offsetHeight,
				),
			);
		fit();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(fit);
		observer.observe(parent);
		return () => observer.disconnect();
	}, []);

	return (
		<FloatingBox
			title={t("title")}
			width={width ?? "auto"}
			position={null}
			anchor="top-right"
			onPositionChange={noop}
			top={PANEL_EDGE_MARGIN}
		>
			<div ref={contentRef} style={{ maxHeight, overflowY: "auto" }}>
				{Children.toArray(children).map((panel, index) => (
					<ConsolePanelIndexContext.Provider key={index} value={index}>
						{panel}
					</ConsolePanelIndexContext.Provider>
				))}
			</div>
		</FloatingBox>
	);
}
