/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useStore } from "zustand";
import Project from "@/schemas/project/project.schema";
import {
	ProjectContextProvider,
	useProjectContext,
} from "./ProjectContext";

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
	getTemplateIdFromUrl: jest.fn<string | null, []>(() => null),
	getTemplateModeFromUrl: jest.fn<"exercise" | "solution", []>(() => "exercise"),
	getTemplateAutostartFromUrl: jest.fn<boolean, []>(() => false),
	clearTemplateParamsFromUrl: jest.fn(),
};
jest.mock("@/ui/stores/project/url/project-url", () => ({
	getProjectIdFromUrl: () => mockUrl.getProjectIdFromUrl(),
	getShareTokenFromUrl: () => mockUrl.getShareTokenFromUrl(),
	setProjectIdInUrl: (...args: unknown[]) => mockUrl.setProjectIdInUrl(...args),
	getTemplateIdFromUrl: () => mockUrl.getTemplateIdFromUrl(),
	getTemplateModeFromUrl: () => mockUrl.getTemplateModeFromUrl(),
	getTemplateAutostartFromUrl: () => mockUrl.getTemplateAutostartFromUrl(),
	clearTemplateParamsFromUrl: () => mockUrl.clearTemplateParamsFromUrl(),
}));

const mockCreateExercise = jest.fn(() => new Project("tpl-exercise", "Exercise", ""));
const mockCreateSolution = jest.fn(() => new Project("tpl-solution", "Solution", ""));
const mockCreateWithStatement = jest.fn(
	() => new Project("tpl-with-statement-exercise", "Avec énoncé", ""),
);
jest.mock("@/templates/index", () => ({
	PROJECT_TEMPLATES: [
		{
			id: "tpl-with-solution",
			create: () => mockCreateExercise(),
			solution: () => mockCreateSolution(),
		},
		{
			id: "tpl-no-solution",
			create: () => mockCreateExercise(),
		},
		{
			id: "tpl-with-statement",
			statement: "## Énoncé",
			create: () => mockCreateWithStatement(),
		},
	],
}));

function ProjectProbe() {
	const store = useProjectContext();
	const project = useStore(store!, (s) => s.project);
	const activePageId = useStore(store!, (s) => s.activePageId);
	const mode = useStore(store!, (s) => s.mode);
	return (
		<div>
			<div data-testid="project-probe">{project?.id ?? "none"}</div>
			<div data-testid="active-page-probe">{activePageId ?? "none"}</div>
			<div data-testid="mode-probe">{mode}</div>
		</div>
	);
}

afterEach(() => {
	mockUrl.getProjectIdFromUrl.mockReturnValue(null);
	mockUrl.getShareTokenFromUrl.mockReturnValue(null);
	mockUrl.setProjectIdInUrl.mockReset();
	mockUrl.getTemplateIdFromUrl.mockReturnValue(null);
	mockUrl.getTemplateModeFromUrl.mockReturnValue("exercise");
	mockUrl.getTemplateAutostartFromUrl.mockReturnValue(false);
	mockUrl.clearTemplateParamsFromUrl.mockReset();
	mockCreateExercise.mockClear();
	mockCreateSolution.mockClear();
	mockCreateWithStatement.mockClear();
});

describe("ProjectContextProvider - modale des brouillons", () => {
	it("la monte au démarrage à froid (aucun id ni token dans l'URL)", () => {
		renderWithI18n(<ProjectContextProvider>{null}</ProjectContextProvider>);

		expect(screen.getByTestId("draft-recovery-dialog")).toBeInTheDocument();
	});

	it("la monte quand la réouverture du projet de l'URL échoue (id invalide / projet supprimé)", async () => {
		mockUrl.getProjectIdFromUrl.mockReturnValue("deleted-id");

		renderWithI18n(<ProjectContextProvider>{null}</ProjectContextProvider>);

		// openProject échoue (projet introuvable) → repli sur la modale + nettoyage de l'URL
		expect(
			await screen.findByTestId("draft-recovery-dialog"),
		).toBeInTheDocument();
		expect(mockUrl.setProjectIdInUrl).toHaveBeenCalledWith(null);
	});
});

describe("ProjectContextProvider - ouverture depuis un template", () => {
	it("ignore silencieusement un template inconnu et retombe sur la modale de brouillon", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("unknown");

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(
			await screen.findByTestId("draft-recovery-dialog"),
		).toBeInTheDocument();
		expect(mockUrl.clearTemplateParamsFromUrl).toHaveBeenCalled();
		expect(mockCreateExercise).not.toHaveBeenCalled();
	});

	it("ouvre la variante exercice par défaut pour un template connu", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-with-solution");

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(await screen.findByTestId("project-probe")).toHaveTextContent(
			"tpl-exercise",
		);
		expect(mockCreateSolution).not.toHaveBeenCalled();
		expect(mockUrl.clearTemplateParamsFromUrl).toHaveBeenCalled();
		expect(screen.queryByTestId("draft-recovery-dialog")).not.toBeInTheDocument();
	});

	it("ouvre la solution quand demandée et disponible", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-with-solution");
		mockUrl.getTemplateModeFromUrl.mockReturnValue("solution");

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(await screen.findByTestId("project-probe")).toHaveTextContent(
			"tpl-solution",
		);
	});

	it("ignore silencieusement la demande de solution si le template n'en a pas", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-no-solution");
		mockUrl.getTemplateModeFromUrl.mockReturnValue("solution");

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(await screen.findByTestId("project-probe")).toHaveTextContent(
			"tpl-exercise",
		);
	});

	it("ouvre directement l'énoncé quand le template en porte un (exercice)", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-with-statement");

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(await screen.findByTestId("project-probe")).toHaveTextContent(
			"tpl-with-statement-exercise",
		);
		expect(await screen.findByTestId("active-page-probe")).toHaveTextContent(
			"exercise",
		);
	});

	it("reste sur la page de démarrage quand le template n'a pas d'énoncé", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-with-solution");

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(await screen.findByTestId("project-probe")).toHaveTextContent(
			"tpl-exercise",
		);
		expect(await screen.findByTestId("active-page-probe")).toHaveTextContent(
			"project-startup",
		);
	});

	it("démarre directement la simulation quand demandé, sans passer par l'énoncé", async () => {
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-with-statement");
		mockUrl.getTemplateAutostartFromUrl.mockReturnValue(true);

		renderWithI18n(
			<ProjectContextProvider>
				<ProjectProbe />
			</ProjectContextProvider>,
		);

		expect(await screen.findByTestId("mode-probe")).toHaveTextContent(
			"SIMULATION",
		);
		expect(screen.getByTestId("active-page-probe")).not.toHaveTextContent(
			"exercise",
		);
	});

	it("laisse la priorité à un id de projet présent dans l'URL", () => {
		mockUrl.getProjectIdFromUrl.mockReturnValue("p1");
		mockUrl.getTemplateIdFromUrl.mockReturnValue("tpl-with-solution");

		renderWithI18n(<ProjectContextProvider>{null}</ProjectContextProvider>);

		expect(mockCreateExercise).not.toHaveBeenCalled();
		expect(mockCreateSolution).not.toHaveBeenCalled();
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
		renderWithI18n(
			<ProjectContextProvider>
				<SetHasUnsavedChanges value={false} />
			</ProjectContextProvider>,
		);

		expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
	});

	it("warns when there are unsaved changes", () => {
		renderWithI18n(
			<ProjectContextProvider>
				<SetHasUnsavedChanges value={true} />
			</ProjectContextProvider>,
		);

		expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
	});
});
