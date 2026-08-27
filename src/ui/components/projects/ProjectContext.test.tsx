/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ProjectContextProvider, useProjectContext } from "./ProjectContext";

jest.mock("./analysis-result/AnalysisResult", () => () => null);
jest.mock("./ExportModal", () => () => null);
jest.mock("./ProjectOpenModal", () => () => null);
jest.mock("./ProjectUnsavedChangesDialog", () => () => null);
jest.mock("./useShortcutsHandler", () => () => {});
jest.mock("./DraftRecoveryDialog", () => ({
	__esModule: true,
	default: function DraftRecoveryDialogMock() {
		return <div data-testid="draft-recovery-dialog" />;
	},
}));
jest.mock("./DraftConflictDialog", () => () => null);

const mockUrl = {
	getProjectIdFromUrl: jest.fn<string | null, []>(() => null),
	getShareTokenFromUrl: jest.fn<string | null, []>(() => null),
	setProjectIdInUrl: jest.fn(),
};
jest.mock("@/ui/lib/project-url", () => ({
	getProjectIdFromUrl: () => mockUrl.getProjectIdFromUrl(),
	getShareTokenFromUrl: () => mockUrl.getShareTokenFromUrl(),
	setProjectIdInUrl: (...args: unknown[]) => mockUrl.setProjectIdInUrl(...args),
}));

afterEach(() => {
	mockUrl.getProjectIdFromUrl.mockReturnValue(null);
	mockUrl.getShareTokenFromUrl.mockReturnValue(null);
	mockUrl.setProjectIdInUrl.mockReset();
});

describe("ProjectContextProvider - modale des brouillons", () => {
	it("la monte au démarrage à froid (aucun id ni token dans l'URL)", () => {
		render(<ProjectContextProvider>{null}</ProjectContextProvider>);

		expect(screen.getByTestId("draft-recovery-dialog")).toBeInTheDocument();
	});

	it("la monte quand la réouverture du projet de l'URL échoue (id invalide / projet supprimé)", async () => {
		mockUrl.getProjectIdFromUrl.mockReturnValue("deleted-id");

		render(<ProjectContextProvider>{null}</ProjectContextProvider>);

		// openProject échoue (projet introuvable) → repli sur la modale + nettoyage de l'URL
		expect(
			await screen.findByTestId("draft-recovery-dialog"),
		).toBeInTheDocument();
		expect(mockUrl.setProjectIdInUrl).toHaveBeenCalledWith(null);
	});
});

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
