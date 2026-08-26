"use client";

import { MouseEvent, RefObject, useCallback, useState } from "react";
import { HmiContextMenuElement } from "./hmi-context-menu";

export default function useHmiContextMenu(canvasRef: RefObject<HTMLElement | null>): {
	visible: boolean;
	element: HmiContextMenuElement;
	position: { x: number; y: number };
	openContextMenu: (event: MouseEvent, element: HmiContextMenuElement) => void;
	closeContextMenu: () => void;
} {
	const [visible, setVisible] = useState(false);
	const [element, setElement] = useState<HmiContextMenuElement>({ type: "pane" });
	const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	return {
		visible,
		element,
		position,
		openContextMenu: useCallback(
			(event: MouseEvent, element: HmiContextMenuElement) => {
				setVisible(true);
				setElement(element);
				setPosition({
					x: event.clientX - canvasRef.current!.getBoundingClientRect().left,
					y: event.clientY - canvasRef.current!.getBoundingClientRect().top,
				});
			},
			[canvasRef],
		),
		closeContextMenu: useCallback(() => {
			setVisible(false);
		}, []),
	};
}
