"use client";
import { createContext, ReactNode, useContext, useEffect } from "react";
import { useProjectContext } from "../projects/ProjectContext";
import { PageData } from "./pages-data";
import usePagesData from "./usePagesData";

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
	const { pagesData, updatePageData, setPagesData } = usePagesData(initialPagesData);
	const { projectEvents } = useProjectContext();

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

	return <PagesContext.Provider value={{ pagesData, updatePageData }}>{children}</PagesContext.Provider>;
};

export const usePagesContext = () => useContext(PagesContext);
