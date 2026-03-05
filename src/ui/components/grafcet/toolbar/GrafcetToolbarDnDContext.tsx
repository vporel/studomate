"use client";
import { ElementType } from "@/schemas/grafcet/element.schema";
import React, { createContext, Dispatch, SetStateAction, useContext, useMemo, useState } from "react";

const GrafcetToolbarDnDContext = createContext<{
	type: ElementType | null;
	setType: Dispatch<SetStateAction<ElementType | null>>;
	extraData: any | null;
	setExtraData: Dispatch<SetStateAction<any>>;
}>({ type: null, setType: () => {}, extraData: null, setExtraData: () => {} });

export const GrafcetToolbarDnDProvider = ({ children }: { children: React.ReactNode }) => {
	const [type, setType] = useState<ElementType | null>(null);
	const [extraData, setExtraData] = useState<any>(null);

	return (
		<GrafcetToolbarDnDContext.Provider
			value={useMemo(
				() => ({ type, setType, extraData, setExtraData }),
				[type, setType, extraData, setExtraData],
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
