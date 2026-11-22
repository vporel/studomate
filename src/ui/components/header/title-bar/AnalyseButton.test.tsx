/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import AnalyseButton from "./AnalyseButton";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(analysisHasErrors = false, analysisHasWarnings = false) {
	const analyze = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			analysisHasErrors,
			analysisHasWarnings,
			simulationManager: { analyze },
		}),
	);
	renderWithI18n(<AnalyseButton />);
	return { analyze, button: screen.getByRole("button", { name: "Analyser" }) };
}

describe("AnalyseButton", () => {
	it("runs the analysis on click", () => {
		const { analyze, button } = setup();
		fireEvent.click(button);
		expect(analyze).toHaveBeenCalledTimes(1);
	});

	it("uses the neutral color when the analysis is clean", () => {
		const { button } = setup();
		expect(button).toHaveStyle({ color: "rgb(70,70,70)" });
	});

	it("turns orange on warnings", () => {
		const { button } = setup(false, true);
		expect(button).toHaveStyle({ color: "rgb(255, 165, 0)" });
	});

	it("turns red on errors, even with warnings", () => {
		const { button } = setup(true, true);
		expect(button).toHaveStyle({ color: "rgb(255, 0, 0)" });
	});
});
