/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { AppContextProvider } from "@/ui/components/AppContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import type { ReactNode } from "react";
import useViewMenu from "./useViewMenu";

jest.mock("@/ui/components/projects/ProjectContext");

const I18n = i18nWrapper();
const wrapper = ({ children }: { children: ReactNode }) => (
	<I18n>
		<AppContextProvider>{children}</AppContextProvider>
	</I18n>
);

const setCrossReferenceResultVisible = jest.fn();
const setAnalysisResultVisible = jest.fn();

function mockProjectStore({
	crossReferenceResultVisible = false,
	analysisResultVisible = false,
}: {
	crossReferenceResultVisible?: boolean;
	analysisResultVisible?: boolean;
} = {}) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { crossReferenceResultVisible, analysisResultVisible },
			setCrossReferenceResultVisible,
			setAnalysisResultVisible,
		}),
	);
}

describe("useViewMenu", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockProjectStore();
	});

	it("exposes the explorer toggle, checked when the explorer is visible", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });
		expect(result.current.id).toBe("view");
		expect(result.current.items[0][0].label).toBe("Explorateur");
		expect(result.current.items[0][0].checked).toBe(true);
	});

	it("toggles the explorer visibility when clicked", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		act(() => result.current.items[0][0].onClick?.());
		expect(result.current.items[0][0].checked).toBe(false);

		act(() => result.current.items[0][0].onClick?.());
		expect(result.current.items[0][0].checked).toBe(true);
	});

	it("exposes cross-references and analysis-results toggles reflecting panel visibility", () => {
		mockProjectStore({ analysisResultVisible: true });
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		const [crossRef, analysis] = result.current.items[1];
		expect(crossRef.label).toBe("Références croisées");
		expect(crossRef.checked).toBe(false);
		expect(analysis.label).toBe("Résultats de l'analyse");
		expect(analysis.checked).toBe(true);
	});

	it("toggles the cross-reference and analysis panels when clicked", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		act(() => result.current.items[1][0].onClick?.());
		expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(true);

		act(() => result.current.items[1][1].onClick?.());
		expect(setAnalysisResultVisible).toHaveBeenCalledWith(true);
	});
});
