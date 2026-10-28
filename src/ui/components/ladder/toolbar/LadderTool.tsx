"use client";

import useCanEdit from "@/ui/components/projects/useCanEdit";
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
	const { setDraggedElement } = useLadderToolbarDnD();
	const canEdit = useCanEdit();
	disabled = disabled || !canEdit;

	return (
		<DraggableToolCell
			width={45}
			disabled={disabled}
			label={label}
			onDragStart={(e) => {
				setDraggedElement(element);
				e.dataTransfer.effectAllowed = "copy";
			}}
			onDragEnd={() => setDraggedElement(null)}
		>
			{children}
		</DraggableToolCell>
	);
};

export default LadderTool;
