/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ProjectContextProvider, useProjectContext } from "./ProjectContext";

jest.mock("./analysis-result/AnalysisResult", () => () => null);
jest.mock("./ExportModal", () => () => null);
jest.mock("./ProjectOpenModal", () => () => null);
jest.mock("./ProjectUnsavedChangesDialog", () => () => null);
jest.mock("./useShortcutsHandler", () => () => {});

function SetHasUnsavedChanges({ value }: { value: boolean }) {
	const store = useProjectContext();
	store?.setState({ hasUnsavedChanges: value });
	return null;
}

function dispatchBeforeUnload(): Event {
	const event = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(event);
	return event;
}

describe("ProjectContextProvider - beforeunload", () => {
	it("does not warn when there are no unsaved changes", () => {
		render(
			<ProjectContextProvider>
				<SetHasUnsavedChanges value={false} />
			</ProjectContextProvider>,
		);

		expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
	});

	it("warns when there are unsaved changes", () => {
		render(
			<ProjectContextProvider>
				<SetHasUnsavedChanges value={true} />
			</ProjectContextProvider>,
		);

		expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
	});
});
