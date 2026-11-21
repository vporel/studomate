/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../ProjectContext";
import useAnalysisStatus from "./useAnalysisStatus";

jest.mock("../ProjectContext");

function status(analysisHasErrors: boolean, analysisHasWarnings: boolean) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ analysisHasErrors, analysisHasWarnings }),
	);
	return renderHook(() => useAnalysisStatus(), { wrapper: i18nWrapper() })
		.result.current;
}

describe("useAnalysisStatus", () => {
	it("is OK in black without issue", () => {
		expect(status(false, false)).toEqual({
			label: "Résultats de l'analyse (OK)",
			color: "black",
		});
	});

	it("reports warnings in orange", () => {
		expect(status(false, true).color).toBe("orange");
	});

	it("reports errors in red, even with warnings", () => {
		expect(status(true, true).color).toBe("red");
	});
});
