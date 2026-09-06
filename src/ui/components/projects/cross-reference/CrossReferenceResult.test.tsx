/**
 * @jest-environment jsdom
 */
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import {
	createCoilElement,
	createContactElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import Project from "@/schemas/project/project.schema";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import { useProjectStore } from "../ProjectContext";
import CrossReferenceResult from "./CrossReferenceResult";

jest.mock("../ProjectContext");
jest.mock("@/ui/i18n/LocaleProvider", () => ({
	useLocaleContext: () => ({ locale: "fr" }),
}));

const goto = jest.fn();
jest.mock("../useGotoProgram", () => ({
	__esModule: true,
	default: () => goto,
}));

function buildProject(): Project {
	const project = new Project("p", "P", "");
	project.addProgram(
		new Ladder("lad1", "Ladder 1", [
			new Section("s1", "Marche", "", [
				createContactElement("Dcy", "NO", 0, 0),
				createCoilElement("Moteur", "normal", 0, 2),
			]),
		]),
	);
	project.addProgram(
		new GrafcetBuilder()
			.id("g1")
			.name("Cycle")
			.addTransition(new TransitionBuilder().id("t1").expression("Moteur").build())
			.build(),
	);
	return project;
}

/**
 * Le filtre vit dans le store : on le simule ici avec une variable locale que
 * `setCrossReferenceFilter` met à jour, en re-rendant le composant.
 */
function setup(visible = true, initialFilter = "") {
	const project = buildProject();
	const setCrossReferenceResultVisible = jest.fn();
	let filter = initialFilter;
	const setCrossReferenceFilter = jest.fn((value: string) => {
		filter = value;
		apply();
		view.rerender(<CrossReferenceResult />);
	});
	const apply = () =>
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				ui: { crossReferenceResultVisible: visible },
				setCrossReferenceResultVisible,
				crossReferenceFilter: filter,
				setCrossReferenceFilter,
				project,
				pagesManager: { openPage: jest.fn() },
			}),
		);
	apply();
	const view = renderWithI18n(<CrossReferenceResult />);
	return { view, setCrossReferenceResultVisible, setCrossReferenceFilter };
}

describe("CrossReferenceResult", () => {
	beforeEach(() => {
		goto.mockClear();
	});

	it("ne rend rien tant que le panneau est masqué", () => {
		setup(false);
		expect(screen.queryByText("Références croisées")).not.toBeInTheDocument();
	});

	it("liste les variables avec leurs groupes lecteurs / écrivains", () => {
		setup();
		expect(screen.getByText("Dcy")).toBeInTheDocument();
		expect(screen.getByText("Moteur")).toBeInTheDocument();
		expect(screen.getByText(/section « Marche ».*bobine/)).toBeInTheDocument();
		expect(
			screen.getByText(/Cycle · réceptivité de transition/),
		).toBeInTheDocument();
	});

	it("navigue vers l'élément au clic sur un emplacement", () => {
		setup();
		fireEvent.click(screen.getByText(/Cycle · réceptivité de transition/));
		expect(goto).toHaveBeenCalledWith("g1", "grafcet", "t1");
	});

	it("filtre les variables sur la saisie et propage au store", () => {
		const { setCrossReferenceFilter } = setup();
		fireEvent.change(screen.getByPlaceholderText("Filtrer les variables…"), {
			target: { value: "dcy" },
		});
		expect(setCrossReferenceFilter).toHaveBeenCalledWith("dcy");
		expect(screen.getByText("Dcy")).toBeInTheDocument();
		expect(screen.queryByText("Moteur")).not.toBeInTheDocument();
	});

	it("préremplit le champ avec le filtre persisté du store", () => {
		setup(true, "Moteur");
		expect(screen.getByDisplayValue("Moteur")).toBeInTheDocument();
		expect(screen.queryByText("Dcy")).not.toBeInTheDocument();
	});

	it("ferme le panneau via le bouton de fermeture", () => {
		const { setCrossReferenceResultVisible } = setup();
		fireEvent.click(screen.getByLabelText("close-cross-references"));
		expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(false);
	});
});
