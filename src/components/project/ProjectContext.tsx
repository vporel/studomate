'use client'
import Project from '@/schemas/project.schema';
import { createTheme } from '@mui/material';
import { Node } from '@xyflow/react';
import { createContext, useState, useContext, ReactNode, useCallback } from 'react';

type ProjectContextType = {
	project: Project|null
};	

const ProjectContext = createContext<ProjectContextType>({
	project: null
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const [project, setProject] = useState<Project|null>(null)

	return (
		<ProjectContext.Provider value={{ project }}>
			{children}
		</ProjectContext.Provider>
	);
}

export const useProjectContext = () => useContext(ProjectContext);