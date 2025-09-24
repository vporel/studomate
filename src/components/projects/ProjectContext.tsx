"use client";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import mitt, { Emitter } from "mitt";
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { GrafcetEdge, GrafcetNode } from "../grafcet/grafcet-nodes-definitions";
import useGrafcetEventsHandler from "./useGrafcetEventsHandler";

export type GrafcetNodeAddActionData = { grafcetId: string } & GrafcetNode;
export type GrafcetEdgeAddActionData = { grafcetId: string } & GrafcetEdge;

export type GrafcetEvents = {
	"grafcet-add": Grafcet;
	"node-add": GrafcetNodeAddActionData;
	"edge-add": GrafcetEdgeAddActionData;
};

type ProjectContextType = {
	project: Project | null;
	grafcetEvents: Emitter<GrafcetEvents>;
};

const ProjectContext = createContext<ProjectContextType>({
	project: null,
	grafcetEvents: mitt<GrafcetEvents>(),
});

const GrafcetEventsHandlerComponent = ({
	setProject,
}: {
	setProject: (val: (p: Project | null) => Project | null) => void;
}) => {
	useGrafcetEventsHandler(setProject);
	return null;
};

export const ProjectContextProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [project, setProject] = useState<Project | null>(new Project());
	const grafcetEvents = useMemo(() => mitt<GrafcetEvents>(), []);

	useEffect(() => {
		console.log("Project updated:", project);
	}, [project]);

	return (
		<ProjectContext.Provider value={{ project, grafcetEvents }}>
			<GrafcetEventsHandlerComponent setProject={setProject} />
			{children}
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);
