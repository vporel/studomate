"use client";

import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import React from "react";
import DraggableToolCell from "./DraggableToolCell";
import {
	DraggedLadderElement,
	useLadderToolbarDnD,
} from "./LadderToolbarDnDContext";

const LadderTool = ({
	element,
	disabled,
	label,
	children,
}: {
	element: DraggedLadderElement;
	disabled?: boolean;
	label?: string;
	children: React.ReactElement;
}) => {
	const { setDraggedItem } = useLadderToolbarDnD();
	const canEdit = useCanEditActivePage();
	disabled = disabled || !canEdit;

	return (
		<DraggableToolCell
			width={45}
			disabled={disabled}
			label={label}
			onDragStart={(e) => {
				setDraggedItem(element);
				e.dataTransfer.effectAllowed = "copy";
			}}
			onDragEnd={() => setDraggedItem(null)}
		>
			{children}
		</DraggableToolCell>
	);
};

export default LadderTool;
