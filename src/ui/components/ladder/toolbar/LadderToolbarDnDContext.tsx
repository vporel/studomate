"use client";
import { CoilType, ContactType } from "@/schemas/ladder/element.schema";
import React, {
	createContext,
	Dispatch,
	SetStateAction,
	useContext,
	useMemo,
	useState,
} from "react";

export type DraggedLadderElement =
	| { kind: "contact"; type: ContactType }
	| { kind: "coil"; type: CoilType };

const LadderToolbarDnDContext = createContext<{
	draggedElement: DraggedLadderElement | null;
	setDraggedElement: Dispatch<SetStateAction<DraggedLadderElement | null>>;
}>({ draggedElement: null, setDraggedElement: () => {} });

export const LadderToolbarDnDProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [draggedElement, setDraggedElement] =
		useState<DraggedLadderElement | null>(null);

	return (
		<LadderToolbarDnDContext.Provider
			value={useMemo(
				() => ({ draggedElement, setDraggedElement }),
				[draggedElement],
			)}
		>
			{children}
		</LadderToolbarDnDContext.Provider>
	);
};

export const useLadderToolbarDnD = () => useContext(LadderToolbarDnDContext);
