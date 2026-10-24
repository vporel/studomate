"use client";

import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type ModuleIntroContextValue = {
	activeStepIndex: number;
	/** The furthest step ever reached for the module: 0 until a step has been passed. */
	furthestStepIndex: number;
	reportSteps: (activeStepIndex: number, furthestStepIndex: number) => void;
};

const ModuleIntroContext = createContext<ModuleIntroContextValue | null>(null);

/** Lets the introduction of a module page know which step the stepper displays. */
export default function ModuleIntroProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [steps, setSteps] = useState({ active: 0, furthest: 0 });
	const reportSteps = useCallback(
		(active: number, furthest: number) => setSteps({ active, furthest }),
		[],
	);
	const value = useMemo(
		() => ({
			activeStepIndex: steps.active,
			furthestStepIndex: steps.furthest,
			reportSteps,
		}),
		[steps, reportSteps],
	);
	return (
		<ModuleIntroContext.Provider value={value}>
			{children}
		</ModuleIntroContext.Provider>
	);
}

export function useModuleIntro() {
	return useContext(ModuleIntroContext);
}
