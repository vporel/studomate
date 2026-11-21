/** @jest-environment jsdom */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import PagesView from "./PagesView";

jest.mock("@/ui/components/projects/ProjectContext");

function mockStub(name: string) {
	return {
		__esModule: true,
		default: (props: Record<string, unknown>) => (
			<div data-testid={name} data-props={JSON.stringify(props)} />
		),
	};
}

jest.mock("./ExercisePage", () => mockStub("exercise"));
jest.mock("./HardwareConfigurationPage", () => mockStub("hardware"));
jest.mock("./Scene3dConfigurationPage", () =>
	mockStub("scene3d-configuration"),
);
jest.mock("./GrafcetPage", () => mockStub("grafcet"));
jest.mock("./LadderPage", () => mockStub("ladder"));
jest.mock("./ProjectPropertiesPage", () => mockStub("project-properties"));
jest.mock("./PreferencesPage", () => mockStub("preferences"));
jest.mock("./ProjectStartupPage", () => mockStub("project-startup"));
jest.mock("./SystemVariablesPage", () => mockStub("system-variables"));
jest.mock("./VariablesPage", () => mockStub("variables"));
jest.mock("./tab-bar/PagesTabBar", () => mockStub("tab-bar"));
jest.mock("../product-tour/editor-tour/EditorTour", () => mockStub("tour"));
jest.mock("../hmi/HmiPageView", () => mockStub("hmi"));
jest.mock("../hmi/HmiSimulationPageView", () => mockStub("hmi-simulation"));
jest.mock("../3d-scene/Scene3dPageView", () => mockStub("scene3d-view"));

const getProgramOrThrow = jest.fn((id: string) => ({ programId: id }));
const getHmiPageOrThrow = jest.fn((id: string) => ({ hmiId: id }));

function setup(pages: Record<string, { type: string }>, order?: string[]) {
	const pagesData = Object.fromEntries(
		Object.entries(pages).map(([id, page]) => [id, { id, title: id, ...page }]),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcetsManager: { getProgramOrThrow },
			laddersManager: { getProgramOrThrow },
			hmiManager: { getHmiPageOrThrow },
			pagesData,
			pagesOrder: order ?? Object.keys(pages),
		}),
	);
	return renderWithI18n(<PagesView />);
}

const propsOf = (testId: string) =>
	JSON.parse(screen.getByTestId(testId).getAttribute("data-props") ?? "{}");

beforeEach(() => {
	getProgramOrThrow.mockClear();
	getHmiPageOrThrow.mockClear();
});

describe("PagesView", () => {
	describe("without any page", () => {
		it("shows the welcome screen with the app name and the shortcuts", () => {
			setup({});
			expect(screen.getByText("Studomate")).toBeInTheDocument();
			expect(screen.getByText(/Ouvrir un projet/)).toBeInTheDocument();
			expect(screen.getByText(/Enregistrer le projet/)).toBeInTheDocument();
			expect(screen.getByText(/Nouveau grafcet/)).toBeInTheDocument();
			expect(screen.getAllByText("Ctrl")).toHaveLength(3);
			for (const key of ["O", "S", "G"]) {
				expect(screen.getByText(key)).toBeInTheDocument();
			}
		});

		it("does not render the tab bar nor the tour", () => {
			setup({});
			expect(screen.queryByTestId("tab-bar")).not.toBeInTheDocument();
			expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
		});
	});

	describe("with pages", () => {
		it("renders the tab bar and the tour", () => {
			setup({ p1: { type: "preferences" } });
			expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
			expect(screen.getByTestId("tour")).toBeInTheDocument();
			expect(screen.queryByText("Studomate")).not.toBeInTheDocument();
		});

		it.each([
			"project-startup",
			"project-properties",
			"preferences",
			"exercise",
			"system-variables",
			"hmi-simulation",
		])("renders the %s page", (type) => {
			setup({ p1: { type } });
			expect(screen.getByTestId(type)).toBeInTheDocument();
		});

		it("renders the hardware configuration page", () => {
			setup({ p1: { type: "hardware-configuration" } });
			expect(screen.getByTestId("hardware")).toBeInTheDocument();
		});

		it("renders the scene configuration page", () => {
			setup({ p1: { type: "scene3d-configuration" } });
			expect(screen.getByTestId("scene3d-configuration")).toBeInTheDocument();
		});

		it("renders the scene view with its page id once the lazy module has loaded", async () => {
			setup({ s1: { type: "scene3d-view" } });
			expect(await screen.findByTestId("scene3d-view")).toBeInTheDocument();
			expect(propsOf("scene3d-view")).toEqual({ pageId: "s1" });
		});

		it("passes its page data to the variables page", () => {
			setup({ v1: { type: "variables" } });
			expect(propsOf("variables").pageData).toMatchObject({
				id: "v1",
				type: "variables",
			});
		});

		it("gives the grafcet page the program of the same id", () => {
			setup({ g1: { type: "grafcet" } });
			expect(getProgramOrThrow).toHaveBeenCalledWith("g1");
			expect(propsOf("grafcet")).toEqual({
				initialGrafcet: { programId: "g1" },
			});
		});

		it("gives the ladder page the program of the same id", () => {
			setup({ l1: { type: "ladder" } });
			expect(getProgramOrThrow).toHaveBeenCalledWith("l1");
			expect(propsOf("ladder")).toEqual({ initialLadder: { programId: "l1" } });
		});

		it("gives the HMI page the page of the same id", () => {
			setup({ h1: { type: "hmi" } });
			expect(getHmiPageOrThrow).toHaveBeenCalledWith("h1");
			expect(propsOf("hmi")).toEqual({ initialHmiPage: { hmiId: "h1" } });
		});

		it("renders nothing for an unknown page type", () => {
			setup({ p1: { type: "something-else" } });
			expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
			expect(screen.queryByTestId("something-else")).not.toBeInTheDocument();
		});

		it("skips an id of the order that has no page data", () => {
			setup({ p1: { type: "preferences" } }, ["ghost", "p1"]);
			expect(screen.getAllByTestId(/^(preferences)$/)).toHaveLength(1);
			expect(getProgramOrThrow).not.toHaveBeenCalled();
		});

		it("renders every open page, in the tab order", () => {
			setup(
				{
					a: { type: "preferences" },
					b: { type: "exercise" },
					c: { type: "project-properties" },
				},
				["c", "a", "b"],
			);
			const order = screen
				.getAllByTestId(/preferences|exercise|project-properties/)
				.map((el) => el.getAttribute("data-testid"));
			expect(order).toEqual(["project-properties", "preferences", "exercise"]);
		});
	});

	it("exposes the product tour anchor on its root", () => {
		const { container } = setup({});
		expect(container.querySelector('[data-tour="pages"]')).toBeInTheDocument();
	});
});
