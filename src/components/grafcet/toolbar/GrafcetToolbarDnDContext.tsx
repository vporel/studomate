"use client";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

const GrafcetToolbarDnDContext = createContext<
	[type: GrafcetElementType | null, setType: Dispatch<SetStateAction<GrafcetElementType | null>>]
>([null, (_) => {}]);

export const GrafcetToolbarDnDProvider = ({ children }: { children: React.ReactNode }) => {
	const [type, setType] = useState<GrafcetElementType | null>(null);

	return (
		<GrafcetToolbarDnDContext.Provider value={[type, setType]}>
			{children}
		</GrafcetToolbarDnDContext.Provider>
	);
};

export default GrafcetToolbarDnDContext;

export const useGrafcetToolbarDnD = () => {
	return useContext(GrafcetToolbarDnDContext);
};
