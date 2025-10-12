"use client";

import Project from "@/schemas/project/Project.class";
import { Dispatch, SetStateAction, useState } from "react";

export default function useProject(): {
	project: Project | null;
	setProject: Dispatch<SetStateAction<Project | null>>;
	fileHandle: FileSystemFileHandle | null;
	setFileHandle: (fh: FileSystemFileHandle | null) => void;
} {
	const [project, setProject] = useState<Project | null>(new Project("Nouveau projet", ""));
	const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

	return {
		project,
		setProject,
		fileHandle,
		setFileHandle,
	};
}
