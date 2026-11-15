/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Scene3dSidePanel from "./Scene3dSidePanel";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("./InlineScene", () => {
	const { useEffect } = jest.requireActual("react");
	return {
		__esModule: true,
		default: function InlineSceneStub({
			openTransport,
			onDisconnect,
		}: {
			openTransport: () => unknown;
			onDisconnect: () => void;
		}) {
			useEffect(() => {
				openTransport();
				return onDisconnect;
			}, [openTransport, onDisconnect]);
			return <div data-testid="scene" />;
		},
	};
});

const openInline = jest.fn();
const releaseInline = jest.fn();
const close = jest.fn();
const show = jest.fn();

function setup(
	availableModes = ["side-panel", "floating-box", "page", "browser-tab"],
) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			scene3dLinkManager: { openInline, releaseInline },
			scene3dDisplayManager: { close, show, availableModes },
		}),
	);
	return renderWithI18n(<Scene3dSidePanel />);
}

describe("Scene3dSidePanel", () => {
	beforeEach(() => jest.clearAllMocks());

	it("shows the scene under its title, linked to the editor", () => {
		setup();
		expect(
			screen.getByRole("region", { name: "Scène 3D" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("scene")).toBeInTheDocument();
		expect(openInline).toHaveBeenCalledTimes(1);
	});

	it("ends the link when it is removed", () => {
		const { unmount } = setup();
		unmount();
		expect(releaseInline).toHaveBeenCalledTimes(1);
	});

	it("closes through the display manager", () => {
		setup();
		fireEvent.click(screen.getByLabelText("Fermer la scène 3D"));
		expect(close).toHaveBeenCalledTimes(1);
	});

	it("offers the other modes, not its own", () => {
		setup();
		expect(
			screen.queryByLabelText("Afficher dans le panneau latéral"),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByLabelText("Afficher dans un cadre flottant"));
		expect(show).toHaveBeenCalledWith("floating-box");
		fireEvent.click(screen.getByLabelText("Afficher dans une page"));
		expect(show).toHaveBeenCalledWith("page");
		fireEvent.click(
			screen.getByLabelText("Ouvrir dans un onglet du navigateur"),
		);
		expect(show).toHaveBeenCalledWith("browser-tab");
	});

	it("only offers the modes of the environment", () => {
		setup(["side-panel", "page"]);
		expect(screen.getByLabelText("Afficher dans une page")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Afficher dans un cadre flottant"),
		).not.toBeInTheDocument();
	});
});
