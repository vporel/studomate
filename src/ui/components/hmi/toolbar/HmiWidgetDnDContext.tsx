"use client";

import { HmiWidgetTool } from "@/ui/components/hmi/view/constants";
import React, { createContext, Dispatch, SetStateAction, useContext, useMemo, useState } from "react";

const HmiWidgetDnDContext = createContext<{
	draggedTool: HmiWidgetTool | null;
	setDraggedTool: Dispatch<SetStateAction<HmiWidgetTool | null>>;
}>({ draggedTool: null, setDraggedTool: () => {} });

export const HmiWidgetDnDProvider = ({ children }: { children: React.ReactNode }) => {
	const [draggedTool, setDraggedTool] = useState<HmiWidgetTool | null>(null);

	return (
		<HmiWidgetDnDContext.Provider value={useMemo(() => ({ draggedTool, setDraggedTool }), [draggedTool])}>
			{children}
		</HmiWidgetDnDContext.Provider>
	);
};

export const useHmiWidgetDnD = () => useContext(HmiWidgetDnDContext);
