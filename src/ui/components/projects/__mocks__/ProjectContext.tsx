import { ReactNode } from "react";

export const useProjectStore = jest.fn();
export const useProjectContext = jest.fn();
export const ProjectContextProvider = ({
	children,
}: {
	children: ReactNode;
}) => <>{children}</>;
