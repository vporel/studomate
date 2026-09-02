/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ProgramIssues from "./ProgramIssues";

describe("ProgramIssues", () => {
	it("ne rend rien quand overall est absent et elements vide", () => {
		const { container } = renderWithI18n(
			<ProgramIssues
				programKind="Grafcet"
				programId="g1"
				programName="Grafcet 1"
				issues={{ overall: undefined as any, elements: {} }}
				severity="error"
				getElementLabel={() => ""}
				onGoto={() => {}}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("affiche au moins le titre du programme quand overall et elements sont vides (tableaux vides = truthy)", () => {
		renderWithI18n(
			<ProgramIssues
				programKind="Grafcet"
				programId="g1"
				programName="Grafcet 1"
				issues={{ overall: [], elements: {} }}
				severity="error"
				getElementLabel={() => ""}
				onGoto={() => {}}
			/>,
		);
		expect(screen.getByText("Grafcet : Grafcet 1")).toBeInTheDocument();
	});

	it("affiche les issues d'éléments avec le libellé de l'élément préfixé", () => {
		renderWithI18n(
			<ProgramIssues
				programKind="Grafcet"
				programId="g1"
				programName="Grafcet 1"
				issues={{
					overall: [],
					elements: { "step-1": ["Problème sur l'étape"] },
				}}
				severity="error"
				getElementLabel={(id) => `Étape ${id}`}
				onGoto={() => {}}
			/>,
		);
		expect(
			screen.getByText("[Étape step-1] Problème sur l'étape"),
		).toBeInTheDocument();
	});

	it("appelle onGoto avec l'id de l'élément au clic sur une issue d'élément", () => {
		const onGoto = jest.fn();
		renderWithI18n(
			<ProgramIssues
				programKind="Grafcet"
				programId="g1"
				programName="Grafcet 1"
				issues={{ overall: [], elements: { "step-1": ["Problème"] } }}
				severity="error"
				getElementLabel={() => ""}
				onGoto={onGoto}
			/>,
		);

		fireEvent.click(screen.getByText(/Problème/));

		expect(onGoto).toHaveBeenCalledWith("step-1");
	});

	it("appelle onGoto sans id au clic sur une issue globale au programme", () => {
		const onGoto = jest.fn();
		renderWithI18n(
			<ProgramIssues
				programKind="Ladder"
				programId="l1"
				programName="Ladder 1"
				issues={{ overall: ["Problème global au ladder"], elements: {} }}
				severity="warning"
				getElementLabel={() => ""}
				onGoto={onGoto}
			/>,
		);

		fireEvent.click(screen.getByText("Problème global au ladder"));

		expect(onGoto).toHaveBeenCalledWith();
	});

	it("libelle les sections selon la sévérité (avertissements)", () => {
		renderWithI18n(
			<ProgramIssues
				programKind="Ladder"
				programId="l1"
				programName="Ladder 1"
				issues={{ overall: ["A"], elements: { e1: ["B"] } }}
				severity="warning"
				getElementLabel={() => "E1"}
				onGoto={() => {}}
			/>,
		);
		expect(
			screen.getByText("Avertissements globaux au ladder"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Avertissements des éléments du ladder"),
		).toBeInTheDocument();
	});
});
