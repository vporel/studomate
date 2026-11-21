/**
 * @jest-environment jsdom
 */
import createAppProjectStoreEnvironment from "@/ui/stores/project/environment/app-project-store-environment";
import { createProjectStore } from "@/ui/stores/project/project.store";
import { act, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { ProjectStoreProvider } from "../projects/ProjectContext";
import { useActiveBottomPanelTab } from "./BottomPanel";

function setup() {
	const store = createProjectStore(createAppProjectStoreEnvironment());
	const wrapper = ({ children }: { children: ReactNode }) => (
		<ProjectStoreProvider store={store}>{children}</ProjectStoreProvider>
	);
	return { store, ...renderHook(() => useActiveBottomPanelTab(), { wrapper }) };
}

describe("useActiveBottomPanelTab with the real store", () => {
	it("renders without looping while the panel is closed", () => {
		const { result } = setup();
		expect(result.current).toBeNull();
	});

	it("follows the tab shown in the store", () => {
		const { store, result } = setup();

		act(() => store.getState().setAnalysisResultVisible(true));
		expect(result.current).toBe("analysis");

		act(() => store.getState().setCrossReferenceResultVisible(true));
		expect(result.current).toBe("crossReference");

		act(() => store.getState().setCrossReferenceResultVisible(false));
		expect(result.current).toBeNull();
	});
});
