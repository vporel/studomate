"use client";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";
import { useProjectContext } from "../projects/ProjectContext";
import { PageData } from "./pages-data";
import usePagesData from "./usePagesData";

type PagesContextType = {
	pagesData: Record<string, PageData>;
	updatePageData: (objectId: string, newData: Partial<PageData>) => void;
	activePageId: string;
	setActivePageId: Dispatch<SetStateAction<string>>;
};

const PagesContext = createContext<PagesContextType>({
	pagesData: {},
	updatePageData: () => {},
	activePageId: "",
	setActivePageId: () => {},
});

export const PagesContextProvider = ({
	initialPagesData,
	children,
}: {
	initialPagesData: Record<string, PageData>;
	children: ReactNode;
}) => {
	if (Object.keys(initialPagesData).length === 0) {
		throw new Error("PagesContextProvider requires at least one page in initialPagesData");
	}
	const { pagesData, updatePageData, setPagesData } = usePagesData(initialPagesData);
	const [activePageId, setActivePageId] = useState<string>(Object.keys(initialPagesData)[0]);
	const { projectEvents, setActiveScope } = useProjectContext();

	useEffect(() => {
		const handleProjectSaved = () => {
			// Set hasUnsavedChanges to false for all pages
			setPagesData((oldPagesData) => {
				const newPagesData = structuredClone(oldPagesData);
				for (const pageId in newPagesData) {
					newPagesData[pageId].hasUnsavedChanges = false;
				}
				return newPagesData;
			});
		};

		projectEvents.on("saved", handleProjectSaved);

		return () => {
			projectEvents.off("saved", handleProjectSaved);
		};
	}, [projectEvents, setPagesData]);

	useEffect(() => {
		setActiveScope(activePageId);
	}, [activePageId, setActiveScope]);

	return (
		<PagesContext.Provider value={{ pagesData, updatePageData, activePageId, setActivePageId }}>
			{children}
		</PagesContext.Provider>
	);
};

export const usePagesContext = () => useContext(PagesContext);
