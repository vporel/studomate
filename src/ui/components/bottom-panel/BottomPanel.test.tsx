/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import BottomPanel from "./BottomPanel";

jest.mock("../projects/ProjectContext");
jest.mock("../projects/analysis-result/AnalysisResult", () => ({
	__esModule: true,
	default: () => <span>contenu analyse</span>,
}));
jest.mock("../projects/cross-reference/CrossReferenceResult", () => ({
	__esModule: true,
	default: () => <span>contenu références</span>,
}));

function setup(
	active: "analysis" | "crossReference" | null,
	analysisHasErrors = false,
) {
	const setAnalysisResultVisible = jest.fn();
	const setCrossReferenceResultVisible = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: {
				analysisResultVisible: active === "analysis",
				crossReferenceResultVisible: active === "crossReference",
			},
			analysisHasErrors,
			analysisHasWarnings: false,
			setAnalysisResultVisible,
			setCrossReferenceResultVisible,
		}),
	);
	const view = renderWithI18n(<BottomPanel />);
	return { view, setAnalysisResultVisible, setCrossReferenceResultVisible };
}

const analysisTab = () =>
	screen.getByRole("tab", { name: /Résultats de l'analyse/ });

describe("BottomPanel", () => {
	it("renders nothing while closed", () => {
		expect(setup(null).view.container).toBeEmptyDOMElement();
	});

	it("shows both tabs, in the order of the status bar buttons, with the active content", () => {
		setup("crossReference");
		expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
			"Références croisées",
			"Résultats de l'analyse (OK)",
		]);
		expect(screen.getByText("contenu références")).toBeInTheDocument();
		expect(screen.queryByText("contenu analyse")).not.toBeInTheDocument();
	});

	it("carries the analysis status on its tab", () => {
		setup("crossReference", true);
		expect(analysisTab()).toHaveTextContent("Résultats de l'analyse (Erreurs)");
		expect(analysisTab()).toHaveStyle({ color: "rgb(255, 0, 0)" });
	});

	it("puts the tour anchors on the tabs", () => {
		setup("analysis");
		expect(analysisTab()).toHaveAttribute("data-tour", "analysis");
		expect(
			screen.getByRole("tab", { name: "Références croisées" }),
		).toHaveAttribute("data-tour", "crossReference");
	});

	it("shows the other tab on click", () => {
		const { setAnalysisResultVisible } = setup("crossReference");
		fireEvent.click(analysisTab());
		expect(setAnalysisResultVisible).toHaveBeenCalledWith(true);
	});

	it.each([
		["analysis", "setAnalysisResultVisible"],
		["crossReference", "setCrossReferenceResultVisible"],
	] as const)("closes the panel shown (%s)", (active, setter) => {
		const setters = setup(active);
		fireEvent.click(screen.getByLabelText("close-bottom-panel"));
		expect(setters[setter]).toHaveBeenCalledWith(false);
	});
});
