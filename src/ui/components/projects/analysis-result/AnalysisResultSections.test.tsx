/** @jest-environment jsdom */
import {
	type AnalysisIssues,
	emptyAnalysisIssues,
} from "@/bridge/analysis-issues.mapper";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../ProjectContext";
import AnalysisResultSections from "./AnalysisResultSections";

jest.mock("../ProjectContext");

const onGotoProgram = jest.fn();

const project = {
	getGrafcet: (id: string) =>
		id === "g1"
			? {
					name: "Cycle",
					getElementById: (elementId: string) =>
						elementId === "t1" ? { type: "transition" } : null,
				}
			: null,
	getLadder: (id: string) =>
		id === "l1"
			? {
					name: "Sorties",
					findElement: (elementId: string) =>
						({
							c1: { element: { type: "contact", data: { variable: "B1" } } },
							k1: { element: { type: "coil", data: { variable: "M1" } } },
							b1: { element: { type: "block", data: {} } },
							r1: { element: { type: "railTerminal" } },
						})[elementId],
				}
			: null,
};

function setup({
	analysisErrors = emptyAnalysisIssues(),
	analysisWarnings = emptyAnalysisIssues(),
}: {
	analysisErrors?: AnalysisIssues;
	analysisWarnings?: AnalysisIssues;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ analysisErrors, analysisWarnings, project }),
	);
	return renderWithI18n(
		<AnalysisResultSections onGotoProgram={onGotoProgram} />,
	);
}

describe("AnalysisResultSections", () => {
	beforeEach(() => onGotoProgram.mockClear());

	it("shows both empty states when there is no issue", () => {
		setup();

		expect(screen.getByText(">> Erreurs")).toBeVisible();
		expect(screen.getByText(">> Avertissements")).toBeVisible();
		expect(screen.getByText("Aucune erreur lors de l'analyse.")).toBeVisible();
		expect(screen.getByText("Aucun avertissement.")).toBeVisible();
	});

	it("lists errors and warnings in their own section", () => {
		setup({
			analysisErrors: { ...emptyAnalysisIssues(), project: ["Erreur X"] },
			analysisWarnings: { ...emptyAnalysisIssues(), project: ["Alerte Y"] },
		});

		expect(screen.getByText("Erreur X")).toBeVisible();
		expect(screen.getByText("Alerte Y")).toBeVisible();
		expect(screen.queryByText("Aucune erreur lors de l'analyse.")).toBeNull();
		expect(screen.queryByText("Aucun avertissement.")).toBeNull();
	});

	it("keeps the empty message of a section without issue when the other has some", () => {
		setup({
			analysisErrors: { ...emptyAnalysisIssues(), project: ["Erreur X"] },
		});

		expect(screen.getByText("Aucun avertissement.")).toBeVisible();
	});

	it("names the grafcet and labels the element type, and goes to the element", () => {
		setup({
			analysisErrors: {
				...emptyAnalysisIssues(),
				grafcets: { g1: { overall: [], elements: { t1: ["Condition vide"] } } },
			},
		});

		expect(screen.getByText("Grafcet : Cycle")).toBeVisible();
		fireEvent.click(screen.getByText("[Transition] Condition vide"));

		expect(onGotoProgram).toHaveBeenCalledWith("g1", "grafcet", "t1");
	});

	it("labels ladder contacts, coils and blocks", () => {
		setup({
			analysisWarnings: {
				...emptyAnalysisIssues(),
				ladders: {
					l1: {
						overall: [],
						elements: {
							c1: ["a"],
							k1: ["b"],
							b1: ["c"],
							r1: ["d"],
						},
					},
				},
			},
		});

		expect(screen.getByText("Ladder : Sorties")).toBeVisible();
		expect(screen.getByText("[Contact B1] a")).toBeVisible();
		expect(screen.getByText("[Bobine M1] b")).toBeVisible();
		expect(screen.getByText("[Bloc] c")).toBeVisible();
		expect(screen.getByText("[] d")).toBeVisible();
	});

	it("goes to the ladder without an element for a program-wide issue", () => {
		setup({
			analysisErrors: {
				...emptyAnalysisIssues(),
				ladders: { l1: { overall: ["Section vide"], elements: {} } },
			},
		});

		fireEvent.click(screen.getByText("Section vide"));

		expect(onGotoProgram).toHaveBeenCalledWith("l1", "ladder", undefined);
	});

	it("falls back on an unknown name and an empty label for a missing program", () => {
		setup({
			analysisErrors: {
				...emptyAnalysisIssues(),
				grafcets: { gone: { overall: [], elements: { x: ["Boom"] } } },
				ladders: { gone2: { overall: [], elements: { y: ["Bam"] } } },
			},
		});

		expect(screen.getByText("Grafcet : Nom inconnu")).toBeVisible();
		expect(screen.getByText("Ladder : Nom inconnu")).toBeVisible();
		expect(screen.getByText("[] Boom")).toBeVisible();
		expect(screen.getByText("[] Bam")).toBeVisible();
	});
});
