import { ReactNode } from "react";

export const useProjectStore = jest.fn();
export const useProjectContext = jest.fn();
export const ProjectStoreProvider = ({ children }: { children: ReactNode }) => (
	<>{children}</>
);
export const useProjectStoreInstance = jest.fn();
