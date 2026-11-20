/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import {
	AnalysisIssues,
	emptyAnalysisIssues,
} from "@/bridge/analysis-issues.mapper";
import { useProjectStore } from "../ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import type { Locale } from "@/i18n/config";
import AnalysisResult from "./AnalysisResult";

jest.mock("../ProjectContext");

function setup({
	analysisResultVisible = true,
	analysisErrors = emptyAnalysisIssues(),
	analysisWarnings = emptyAnalysisIssues(),
	setAnalysisResultVisible = jest.fn(),
	openPage = jest.fn(),
	locale = "fr",
}: {
	locale?: Locale;
	analysisResultVisible?: boolean;
	analysisErrors?: AnalysisIssues;
	analysisWarnings?: AnalysisIssues;
	setAnalysisResultVisible?: jest.Mock;
	openPage?: jest.Mock;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { analysisResultVisible },
			setAnalysisResultVisible,
			analysisErrors,
			analysisWarnings,
			project: {
				getGrafcet: (id: string) =>
					id === "g1"
						? {
								name: "Grafcet 1",
								getElementById: (elementId: string) =>
									elementId === "a1" ? { type: "action" } : null,
							}
						: null,
				getLadder: () => null,
			},
			grafcetsManager: { getActiveStoreManagers: () => null },
			laddersManager: { getActiveStoreManagers: () => null },
			pagesManager: { openPage },
		}),
	);

	return renderWithI18n(<AnalysisResult />, { locale });
}

describe("AnalysisResult", () => {
	afterEach(() => jest.clearAllMocks());

	it.each([
		["fr", "[Action] Variable inconnue"],
		["en", "[Action] Variable inconnue"],
		["es", "[Acción] Variable inconnue"],
	] as const)(
		"préfixe une erreur d'élément grafcet par son type, dans la langue de l'interface (%s)",
		(locale, expected) => {
			setup({
				locale,
				analysisErrors: {
					...emptyAnalysisIssues(),
					grafcets: {
						g1: { overall: [], elements: { a1: ["Variable inconnue"] } },
					},
				},
			});
			expect(screen.getByText(expected)).toBeInTheDocument();
		},
	);

	it("ne rend rien quand le panneau n'est pas visible", () => {
		const { container } = setup({ analysisResultVisible: false });
		expect(container).toBeEmptyDOMElement();
	});

	it("affiche 'aucune erreur' et 'aucun avertissement' pour un projet sans issue", () => {
		setup();
		expect(
			screen.getByText("Aucune erreur lors de l'analyse."),
		).toBeInTheDocument();
		expect(screen.getByText("Aucun avertissement.")).toBeInTheDocument();
	});

	it("affiche les erreurs globales au projet dans la section Erreurs", () => {
		setup({
			analysisErrors: {
				...emptyAnalysisIssues(),
				project: ["Erreur globale X"],
			},
		});
		expect(screen.getByText("Erreur globale X")).toBeInTheDocument();
	});

	it("affiche les avertissements d'un grafcet dans la section Avertissements", () => {
		setup({
			analysisWarnings: {
				...emptyAnalysisIssues(),
				grafcets: {
					g1: { overall: ["Avertissement global au grafcet"], elements: {} },
				},
			},
		});
		expect(
			screen.getByText("Avertissement global au grafcet"),
		).toBeInTheDocument();
		expect(screen.getByText("Grafcet : Grafcet 1")).toBeInTheDocument();
	});

	it("navigue vers le programme au clic sur une issue globale au grafcet", () => {
		const openPage = jest.fn();
		setup({
			analysisErrors: {
				...emptyAnalysisIssues(),
				grafcets: { g1: { overall: ["Boom"], elements: {} } },
			},
			openPage,
		});

		fireEvent.click(screen.getByText("Boom"));

		expect(openPage).toHaveBeenCalledWith({
			type: "grafcet",
			id: "g1",
			title: "Grafcet 1",
		});
	});

	it("ferme le panneau au clic sur le bouton de fermeture", () => {
		const setAnalysisResultVisible = jest.fn();
		setup({ setAnalysisResultVisible });

		fireEvent.click(screen.getByLabelText("close-analysis-errors"));

		expect(setAnalysisResultVisible).toHaveBeenCalledWith(false);
	});
});
