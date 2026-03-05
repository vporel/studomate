"use client";

import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

export type ViewAppearance = {
	explorer: boolean;
};

type ContextType = {
	viewAppearance: ViewAppearance;
	setViewAppearance: Dispatch<SetStateAction<ViewAppearance>>;
};

const AppContext = createContext<ContextType>({
	viewAppearance: {
		explorer: true,
	},
	setViewAppearance: () => {},
});

export function AppContextProvider({ children }: { children: React.ReactNode }) {
	const [viewAppearance, setViewAppearance] = useState<ViewAppearance>({
		explorer: true,
	});

	return (
		<AppContext.Provider value={{ viewAppearance, setViewAppearance }}>{children}</AppContext.Provider>
	);
}

export const useAppContext = () => useContext(AppContext);
