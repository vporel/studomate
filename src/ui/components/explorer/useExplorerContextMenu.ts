"use client";

import { MouseEvent, RefObject, useCallback, useState } from "react";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";

export default function useExplorerContextMenu(
	explorerRef: RefObject<HTMLDivElement | null>,
): {
	visible: boolean;
	element: ExplorerContextMenuElement;
	position: { x: number; y: number };
	openContextMenu: (
		event: MouseEvent,
		element: ExplorerContextMenuElement,
	) => void;
	closeContextMenu: () => void;
} {
	const [visible, setVisible] = useState(false);
	const [element, setElement] = useState<ExplorerContextMenuElement>({
		type: "pane",
	});
	const [position, setPosition] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});

	return {
		visible,
		element,
		position,
		openContextMenu: useCallback(
			(event: MouseEvent, element: ExplorerContextMenuElement) => {
				setVisible(true);
				setElement(element);
				setPosition({
					x: event.clientX - explorerRef.current!.getBoundingClientRect().left,
					y: event.clientY - explorerRef.current!.getBoundingClientRect().top,
				});
			},
			[explorerRef],
		),
		closeContextMenu: useCallback(() => {
			setVisible(false);
		}, []),
	};
}
