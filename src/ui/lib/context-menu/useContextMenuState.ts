"use client";

import { MouseEvent, RefObject, useCallback, useState } from "react";

/**
 * État d'un menu contextuel : cible, visibilité et position relative au conteneur.
 * `initialElement` est la cible tant qu'aucun menu n'a été ouvert.
 */
export default function useContextMenuState<TElement>(
	containerRef: RefObject<HTMLElement | null>,
	initialElement: TElement,
): {
	visible: boolean;
	element: TElement;
	position: { x: number; y: number };
	openContextMenu: (event: MouseEvent, element: TElement) => void;
	closeContextMenu: () => void;
} {
	const [visible, setVisible] = useState(false);
	const [element, setElement] = useState<TElement>(initialElement);
	const [position, setPosition] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});

	return {
		visible,
		element,
		position,
		openContextMenu: useCallback(
			(event: MouseEvent, element: TElement) => {
				setVisible(true);
				setElement(element);
				const rect = containerRef.current!.getBoundingClientRect();
				setPosition({
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
				});
			},
			[containerRef],
		),
		closeContextMenu: useCallback(() => {
			setVisible(false);
		}, []),
	};
}
