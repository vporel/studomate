"use client";

import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback } from "react";
import { ProjectEventsOut } from "./project-events";

export default function useGrafcetActions(
	project: Project | null,
	setProject: Dispatch<SetStateAction<Project | null>>,
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
	projectEventsOut: Emitter<ProjectEventsOut>
): {
	newGrafcet: (name: string, format: GrafcetFormat) => Grafcet | null;
	deleteGrafcet: (grafcetId: string) => void;
	renameGrafcet: (grafcetId: string, newName: string) => void;
} {
	const newGrafcet = useCallback(
		(name: string, format: GrafcetFormat) => {
			if (!project) return null;
			const newProject = project.copy();
			const grafcet = newProject.addGrafcet(name, format);
			projectEventsOut.emit("grafcet-open", grafcet);
			setProject(newProject);
			setHasUnsavedChanges(true);
			return grafcet;
		},
		[project, projectEventsOut, setProject, setHasUnsavedChanges]
	);

	const deleteGrafcet = useCallback(
		(grafcetId: string) => {
			setProject((prevProject) => {
				if (!prevProject) return prevProject;
				const newProject = prevProject.copy();
				if (newProject.grafcets[grafcetId]) {
					newProject.deleteGrafcet(grafcetId);
					setHasUnsavedChanges(true);
					projectEventsOut.emit("grafcet-deleted", grafcetId);
				}
				return newProject;
			});
		},
		[setProject, setHasUnsavedChanges, projectEventsOut]
	);

	const renameGrafcet = useCallback(
		(grafcetId: string, newName: string) => {
			setProject((prevProject) => {
				if (!prevProject) return prevProject;
				const newProject = prevProject.copy();
				if (newProject.grafcets[grafcetId]) {
					newProject.grafcets[grafcetId].name = newName;
					setHasUnsavedChanges(true);
					projectEventsOut.emit("grafcet-renamed", { grafcetId, newName });
				}
				return newProject;
			});
		},
		[setProject, setHasUnsavedChanges, projectEventsOut]
	);

	return { newGrafcet, deleteGrafcet, renameGrafcet };
}
