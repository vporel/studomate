"use client";
import React, {
	createContext,
	Dispatch,
	SetStateAction,
	useContext,
	useMemo,
	useState,
} from "react";

export type DndContextValue<T> = {
	draggedItem: T | null;
	setDraggedItem: Dispatch<SetStateAction<T | null>>;
};

export default function createDndContext<T>() {
	const Context = createContext<DndContextValue<T>>({
		draggedItem: null,
		setDraggedItem: () => {},
	});

	const Provider = ({ children }: { children: React.ReactNode }) => {
		const [draggedItem, setDraggedItem] = useState<T | null>(null);

		return (
			<Context.Provider
				value={useMemo(() => ({ draggedItem, setDraggedItem }), [draggedItem])}
			>
				{children}
			</Context.Provider>
		);
	};

	const useDnD = () => useContext(Context);

	return { Provider, useDnD };
}
