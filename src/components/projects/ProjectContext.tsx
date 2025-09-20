'use client'
import Project from '@/schemas/project.schema';
import { createTheme } from '@mui/material';
import { Node } from '@xyflow/react';
import { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { GrafcetEdge, GrafcetNode } from '../grafcet/grafcet-nodes-definitions';
import mitt, { Emitter } from 'mitt';
import useGrafcetEventsHandler from './useGrafcetEventsHandler';

export type GrafcetNodeAddActionData = {grafcetId: string} & GrafcetNode
export type GrafcetEdgeAddActionData = {grafcetId: string} & GrafcetEdge

export type GrafcetEvents = {
	"node-add": GrafcetNodeAddActionData,
	"edge-add": GrafcetEdgeAddActionData
}

type ProjectContextType = {
	project: Project|null,
	grafcetEvents: Emitter<GrafcetEvents>,
};	

const ProjectContext = createContext<ProjectContextType>({
	project: null,
	grafcetEvents: mitt<GrafcetEvents>(),
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const [project, setProject] = useState<Project|null>(new Project())
	const grafcetEvents = useMemo(() => mitt<GrafcetEvents>(), [])

	useGrafcetEventsHandler()

	return (
		<ProjectContext.Provider value={{ project, grafcetEvents }}>
			{children}
		</ProjectContext.Provider>
	);
}

export const useProjectContext = () => useContext(ProjectContext);