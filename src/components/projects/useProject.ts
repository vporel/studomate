"use client";

import Project from "@/schemas/project/Project.class";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

export default function useProject(): {
	project: Project | null;
	setProject: Dispatch<SetStateAction<Project | null>>;
	fileHandle: FileSystemFileHandle | null;
	setFileHandle: (fh: FileSystemFileHandle | null) => void;
	changeProjectName: (newName: string) => void;
	changeProjectAuthor: (newAuthor: string) => void;
} {
	const [project, setProject] = useState<Project | null>(new Project("Nouveau projet", ""));
	const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

	const changeProjectName = useCallback((newName: string) => {
		setProject((oldProject) => {
			if (!oldProject) return oldProject;
			const newProject = oldProject.copy();
			newProject.name = newName;
			return newProject;
		});
	}, []);

	const changeProjectAuthor = useCallback((newAuthor: string) => {
		setProject((oldProject) => {
			if (!oldProject) return oldProject;
			const newProject = oldProject.copy();
			newProject.author = newAuthor;
			return newProject;
		});
	}, []);

	return {
		project,
		setProject,
		fileHandle,
		setFileHandle,
		changeProjectName,
		changeProjectAuthor,
	};
}
