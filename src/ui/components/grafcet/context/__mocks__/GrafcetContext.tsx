import { ReactNode } from "react";

export const useGrafcetStore = jest.fn();
export const useGrafcetContext = jest.fn();
export const useGrafcetStoreApi = jest.fn();
export const GrafcetContextProvider = ({
	children,
}: {
	children: ReactNode;
}) => <>{children}</>;
