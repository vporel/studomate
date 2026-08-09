/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetPage from "./GrafcetPage";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../grafcet/context/GrafcetContext", () => ({
	GrafcetContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("../grafcet/toolbar/GrafcetToolbarDnDContext", () => ({
	GrafcetToolbarDnDProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("../grafcet/toolbar/GrafcetToolbar", () => {
	return function GrafcetToolbarMock() {
		return <div>toolbar</div>;
	};
});
jest.mock("../grafcet/flow/GrafcetFlow", () => {
	return function GrafcetFlowMock() {
		return <div>flow</div>;
	};
});

describe("GrafcetPage", () => {
	const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").build();

	function setup(activePageId: string | null) {
		(useProjectStore as jest.Mock).mockImplementation(selectorImplementation({ activePageId }));
		return render(<GrafcetPage initialGrafcet={grafcet} />);
	}

	afterEach(() => jest.clearAllMocks());

	it("shows the page when this page is the active tab", () => {
		setup("grafcet-1");
		expect(screen.getByText("flow").closest(`#page-${grafcet.id}`)).toHaveStyle({ display: "flex" });
	});

	it("hides the page, without unmounting GrafcetFlow or the toolbar, when another tab is active", () => {
		setup("some-other-page");
		expect(screen.getByText("flow").closest(`#page-${grafcet.id}`)).toHaveStyle({ display: "none" });
		expect(screen.getByText("toolbar")).toBeInTheDocument();
	});
});
