"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import AbstractProjectCommand from "@/schemas/project/commands/AbstractProjectCommand.class";
import Project from "@/schemas/project/Project.class";
import { RefObject, useCallback, useRef } from "react";

export default function useCommandsStack(
	project: Project | null,
	setProject: (p: Project) => void
): {
	commandsStackRef: RefObject<CommandsStack<Project>>;
	undoLastCommand: () => AbstractProjectCommand<any>[] | null;
	redoLastCommand: () => AbstractProjectCommand<any>[] | null;
} {
	const commandsStackRef = useRef<CommandsStack<Project>>(new CommandsStack<Project>(100));

	const undoLastCommand = useCallback(() => {
		if (!project) return null;
		const [newProject, commands] = commandsStackRef.current.undo(
			Object.assign(Object.create(Project.prototype), { ...project }) as Project
		);
		if (newProject) setProject(newProject);
		return commands;
	}, [project, setProject]);

	const redoLastCommand = useCallback(() => {
		if (!project) return null;
		const [newProject, commands] = commandsStackRef.current.redo(
			Object.assign(Object.create(Project.prototype), project) as Project
		);
		if (newProject) setProject(newProject);
		return commands;
	}, [project, setProject]);

	return { commandsStackRef, undoLastCommand, redoLastCommand };
}
