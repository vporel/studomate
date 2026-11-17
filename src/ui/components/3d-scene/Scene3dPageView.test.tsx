/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Scene3dPageView from "./Scene3dPageView";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../pages/Page", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
jest.mock("./InlineScene", () => ({
	__esModule: true,
	default: ({ foldPanels }: { foldPanels?: boolean }) => (
		<div data-testid="scene" data-fold-panels={String(!!foldPanels)} />
	),
}));

const show = jest.fn();

function setup({
	availableModes = ["floating-box", "page", "browser-tab"],
	activePageId = "scene3d-view",
}: { availableModes?: string[]; activePageId?: string } = {}) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			activePageId,
			scene3dLinkManager: { openInline: jest.fn(), releaseInline: jest.fn() },
			scene3dDisplayManager: { show, availableModes },
		}),
	);
	return renderWithI18n(<Scene3dPageView pageId="scene3d-view" />);
}

describe("Scene3dPageView", () => {
	afterEach(() => jest.clearAllMocks());

	it("shows the scene while its page is the active one only", () => {
		setup();
		expect(screen.getByTestId("scene")).toBeInTheDocument();
	});

	it("starts with every panel of the controls open", () => {
		setup();
		expect(screen.getByTestId("scene")).toHaveAttribute(
			"data-fold-panels",
			"false",
		);
	});

	it("does not show the scene, nor its bar, in a page that is not active", () => {
		setup({ activePageId: "other" });
		expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("offers the other modes in a small bar", () => {
		setup();
		expect(
			screen.getByLabelText("Afficher dans un cadre flottant"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("Ouvrir dans un onglet du navigateur"),
		).toBeInTheDocument();
	});

	it("switches to the mode that is clicked", () => {
		setup();
		fireEvent.click(screen.getByLabelText("Afficher dans un cadre flottant"));
		expect(show).toHaveBeenCalledWith("floating-box");
		fireEvent.click(
			screen.getByLabelText("Ouvrir dans un onglet du navigateur"),
		);
		expect(show).toHaveBeenCalledWith("browser-tab");
	});

	it("only offers the modes of the environment", () => {
		setup({ availableModes: ["page", "floating-box"] });
		expect(
			screen.getByLabelText("Afficher dans un cadre flottant"),
		).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Ouvrir dans un onglet du navigateur"),
		).not.toBeInTheDocument();
	});

	it("has no bar when the page is the only mode, as in an embedded block", () => {
		setup({ availableModes: ["page"] });
		expect(screen.getByTestId("scene")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
