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
jest.mock("./Page", () => {
	return function PageMock({ children }: { children: React.ReactNode }) {
		return <div>{children}</div>;
	};
});

describe("GrafcetPage", () => {
	const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").build();

	function setup(activePageId: string | null) {
		(useProjectStore as jest.Mock).mockImplementation(selectorImplementation({ activePageId }));
		return render(<GrafcetPage initialGrafcet={grafcet} />);
	}

	afterEach(() => jest.clearAllMocks());

	it("mounts GrafcetFlow when this page is the active tab", () => {
		setup("grafcet-1");
		expect(screen.getByText("flow")).toBeInTheDocument();
	});

	it("does not mount GrafcetFlow when another tab is active", () => {
		setup("some-other-page");
		expect(screen.queryByText("flow")).not.toBeInTheDocument();
	});

	it("keeps the toolbar mounted regardless of which tab is active", () => {
		setup("some-other-page");
		expect(screen.getByText("toolbar")).toBeInTheDocument();
	});
});
