"use client";
import CommandsStack from "@/schemas/commands/CommandsStack.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useContext, useMemo, useRef, useState } from "react";
import useGrafcetEventsHandler from "./useGrafcetEventsHandler";

export type GrafcetEvents = {
	"grafcet-save": Grafcet;
};

type ProjectContextType = {
	project: Project | null;
	grafcetEvents: Emitter<GrafcetEvents>;
};

const ProjectContext = createContext<ProjectContextType>({
	project: null,
	grafcetEvents: mitt<GrafcetEvents>(),
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const [project, setProject] = useState<Project | null>(new Project());
	const commandsStackRef = useRef<CommandsStack<Project>>(new CommandsStack<Project>());
	const grafcetEvents = useMemo(() => mitt<GrafcetEvents>(), []);

	useGrafcetEventsHandler(grafcetEvents, setProject, commandsStackRef.current);

	return <ProjectContext.Provider value={{ project, grafcetEvents }}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => useContext(ProjectContext);
