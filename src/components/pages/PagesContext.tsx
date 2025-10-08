"use client";
import { Node } from "@xyflow/react";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type PageDataBase = {
	title: string;
	active: boolean;
	hasUnsavedChanges: boolean;
};

export type GrafcetPageData = PageDataBase & {
	type: "grafcet";
	width?: number;
	height?: number;
	nodes?: Array<Node>;
};

type PageData = GrafcetPageData;

type PagesContextType = {
	pagesData: Record<string, PageData>;
	updatePageData: (objectId: string, newData: Partial<PageData>) => void;
};

const PagesContext = createContext<PagesContextType>({
	pagesData: {},
	updatePageData: () => {},
});

export const PagesContextProvider = ({
	initialPagesData,
	children,
}: {
	initialPagesData: Record<string, PageData>;
	children: ReactNode;
}) => {
	const [pagesData, setPagesData] = useState<Record<string, PageData>>(initialPagesData);

	const updatePageData = useCallback((objectId: string, newData: Partial<PageData>) => {
		setPagesData((oldPagesData) => {
			const newPagesData = structuredClone(oldPagesData);
			newPagesData[objectId] = { ...newPagesData[objectId], ...newData };
			return newPagesData;
		});
	}, []);

	return <PagesContext.Provider value={{ pagesData, updatePageData }}>{children}</PagesContext.Provider>;
};

export const usePagesContext = () => useContext(PagesContext);
