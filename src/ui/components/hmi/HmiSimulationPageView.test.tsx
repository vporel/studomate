/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HmiSimulationPageView from "./HmiSimulationPageView";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/pages/Page", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
jest.mock("./HmiPageView", () => ({
	__esModule: true,
	default: () => <div>hmi-page-view</div>,
}));

describe("HmiSimulationPageView", () => {
	beforeEach(() => {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { getHmiPage: jest.fn() },
				hmiSimulationActivePageId: null,
			}),
		);
	});

	it("renders the translated empty message when there is no HMI page", () => {
		const { getByText, queryByText } = renderWithI18n(
			<HmiSimulationPageView />,
		);
		expect(getByText("Aucune page HMI à afficher.")).toBeTruthy();
		expect(queryByText("hmi-page-view")).toBeNull();
	});

	it("renders the English message with the en locale", () => {
		const { getByText } = renderWithI18n(<HmiSimulationPageView />, {
			locale: "en",
		});
		expect(getByText("No HMI page to display.")).toBeTruthy();
	});
});
