"use client";

import { ProjectEventsOut } from "@/components/projects/project-events";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useEffect } from "react";
import { PROJECT_STARTUP_PAGE_DATA, PROJECT_STARTUP_PAGE_ID } from "../ProjectStartupPage";
import { PageData } from "./pages-data";

export default function useProjectEventsOutHandlers(
	setPagesData: Dispatch<SetStateAction<Record<string, PageData>>>,
	projectEventsOut: Emitter<ProjectEventsOut>,
	setActivePageId: Dispatch<SetStateAction<string>>,
	openPage: (pageId: string, pageData: PageData) => void,
	closePage: (pageId: string) => void
) {
	// When a project is created, close all the pages and open the project startup page
	useEffect(() => {
		const handleProjectCreated = () => {
			setPagesData({
				[PROJECT_STARTUP_PAGE_ID]: PROJECT_STARTUP_PAGE_DATA,
			});
			setActivePageId(PROJECT_STARTUP_PAGE_ID);
		};

		projectEventsOut.on("project-created", handleProjectCreated);
		return () => {
			projectEventsOut.off("project-created", handleProjectCreated);
		};
	}, [projectEventsOut, setPagesData, setActivePageId]);

	// When a project is opened, close all the pages and open the project startup page
	useEffect(() => {
		const handleProjectOpened = () => {
			setPagesData({
				[PROJECT_STARTUP_PAGE_ID]: PROJECT_STARTUP_PAGE_DATA,
			});
			setActivePageId(PROJECT_STARTUP_PAGE_ID);
		};

		projectEventsOut.on("project-opened", handleProjectOpened);
		return () => {
			projectEventsOut.off("project-opened", handleProjectOpened);
		};
	}, [projectEventsOut, setPagesData, setActivePageId]);

	// When the project is saved, set hasUnsavedChanges to false for all pages
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

		projectEventsOut.on("project-saved", handleProjectSaved);
		return () => {
			projectEventsOut.off("project-saved", handleProjectSaved);
		};
	}, [projectEventsOut, setPagesData]);

	// When a grafcet is opened, add it to the pages data
	useEffect(() => {
		const handleGrafcetOpen = (grafcet: Grafcet) => {
			// Set hasUnsavedChanges to false for all pages
			openPage(grafcet.id, {
				type: "grafcet",
				title: grafcet.name,
				grafcet,
			});
		};

		projectEventsOut.on("grafcet-open", handleGrafcetOpen);
		return () => {
			projectEventsOut.off("grafcet-open", handleGrafcetOpen);
		};
	}, [projectEventsOut, openPage]);

	// When a grafcet is deleted, remove it from the pages data
	useEffect(() => {
		projectEventsOut.on("grafcet-deleted", closePage);
		return () => {
			projectEventsOut.off("grafcet-deleted", closePage);
		};
	}, [projectEventsOut, closePage]);

	// When a grafcet is renamed, update its title in the pages data
	useEffect(() => {
		const handleGrafcetRenamed = ({ grafcetId, newName }: { grafcetId: string; newName: string }) => {
			setPagesData((oldPagesData) => {
				const newPagesData = structuredClone(oldPagesData);
				if (newPagesData[grafcetId] && newPagesData[grafcetId].type === "grafcet") {
					newPagesData[grafcetId].title = newName;
				}
				return newPagesData;
			});
		};
		projectEventsOut.on("grafcet-renamed", handleGrafcetRenamed);
		return () => {
			projectEventsOut.off("grafcet-renamed", handleGrafcetRenamed);
		};
	}, [projectEventsOut, setPagesData]);
}
