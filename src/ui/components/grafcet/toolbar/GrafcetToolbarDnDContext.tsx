"use client";
import { ElementType } from "@/schemas/grafcet/element.schema";
import React, {
	createContext,
	Dispatch,
	SetStateAction,
	useContext,
	useMemo,
	useState,
} from "react";

export type DraggedGrafcetElement =
	| { type: "step"; extraData: { initial?: boolean } }
	| { type: Exclude<ElementType, "step"> };

const GrafcetToolbarDnDContext = createContext<{
	draggedElement: DraggedGrafcetElement | null;
	setDraggedElement: Dispatch<SetStateAction<DraggedGrafcetElement | null>>;
}>({ draggedElement: null, setDraggedElement: () => {} });

export const GrafcetToolbarDnDProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [draggedElement, setDraggedElement] =
		useState<DraggedGrafcetElement | null>(null);

	return (
		<GrafcetToolbarDnDContext.Provider
			value={useMemo(
				() => ({ draggedElement, setDraggedElement }),
				[draggedElement],
			)}
		>
			{children}
		</GrafcetToolbarDnDContext.Provider>
	);
};

export default GrafcetToolbarDnDContext;

export const useGrafcetToolbarDnD = () => {
	return useContext(GrafcetToolbarDnDContext);
};
