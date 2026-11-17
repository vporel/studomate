/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Scene3dFloatingBox from "./Scene3dFloatingBox";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("./InlineScene", () => {
	const { useEffect } = jest.requireActual("react");
	return {
		__esModule: true,
		default: function InlineSceneStub({
			openTransport,
			onDisconnect,
			foldPanels,
		}: {
			openTransport: () => unknown;
			onDisconnect: () => void;
			foldPanels?: boolean;
		}) {
			useEffect(() => {
				openTransport();
				return onDisconnect;
			}, [openTransport, onDisconnect]);
			return (
				<div data-testid="scene" data-fold-panels={String(!!foldPanels)} />
			);
		},
	};
});

const FRAME_KEY = "studomate_scene3d_floating_frame";
const SCENE = { sceneId: "parking", sceneVersion: 1, bindings: {} };

const openInline = jest.fn();
const releaseInline = jest.fn();
const close = jest.fn();
const show = jest.fn();

function setup({
	visible = true,
	scene3d = SCENE as object | null,
	availableModes = ["floating-box", "page", "browser-tab"],
}: {
	visible?: boolean;
	scene3d?: object | null;
	availableModes?: string[];
} = {}) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { scene3dFloatingVisible: visible },
			project: { scene3d },
			scene3dLinkManager: { openInline, releaseInline },
			scene3dDisplayManager: { close, show, availableModes },
		}),
	);
	return renderWithI18n(<Scene3dFloatingBox />);
}

describe("Scene3dFloatingBox", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => {
		restoreLocalStorage();
		jest.clearAllMocks();
	});

	it("shows nothing while the frame is hidden", () => {
		setup({ visible: false });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(openInline).not.toHaveBeenCalled();
	});

	it("shows nothing when the project has no scene, even if the frame is flagged visible", () => {
		setup({ scene3d: null });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("shows the scene in a frame, linked to the editor", () => {
		setup();
		expect(
			screen.getByRole("dialog", { name: "Scène 3D" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("scene")).toBeInTheDocument();
		expect(openInline).toHaveBeenCalledTimes(1);
	});

	it("starts with only the first panel of the controls open", () => {
		setup();
		expect(screen.getByTestId("scene")).toHaveAttribute(
			"data-fold-panels",
			"true",
		);
	});

	it("ends the link of the page when closed from outside", () => {
		const { unmount } = setup();
		unmount();
		expect(releaseInline).toHaveBeenCalled();
	});

	it("closes through the display manager", () => {
		setup();
		fireEvent.click(screen.getByLabelText("Fermer la scène 3D"));
		expect(close).toHaveBeenCalledTimes(1);
	});

	it("offers to show the scene in a page instead", () => {
		setup();
		fireEvent.click(screen.getByLabelText("Afficher dans une page"));
		expect(show).toHaveBeenCalledWith("page");
	});

	it("offers to open the scene in a browser tab instead", () => {
		setup();
		fireEvent.click(
			screen.getByLabelText("Ouvrir dans un onglet du navigateur"),
		);
		expect(show).toHaveBeenCalledWith("browser-tab");
	});

	it("only offers the modes of the environment", () => {
		setup({ availableModes: ["floating-box", "page"] });
		expect(screen.getByLabelText("Afficher dans une page")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Ouvrir dans un onglet du navigateur"),
		).not.toBeInTheDocument();
	});

	it("can be resized", () => {
		setup();
		expect(document.querySelectorAll("[data-resize-handle]")).toHaveLength(8);
	});

	it("opens with the default size when no frame was remembered, and remembers the frame it opened with", () => {
		jest
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(1000);
		jest
			.spyOn(HTMLElement.prototype, "clientHeight", "get")
			.mockReturnValue(700);
		jest
			.spyOn(HTMLElement.prototype, "offsetWidth", "get")
			.mockReturnValue(420);
		jest
			.spyOn(HTMLElement.prototype, "offsetParent", "get")
			.mockImplementation(function (this: HTMLElement) {
				return this.parentElement;
			});

		setup();

		expect(screen.getByRole("dialog")).toHaveStyle({
			width: "420px",
			height: "320px",
		});
		expect(JSON.parse(localStorage.getItem(FRAME_KEY)!)).toEqual({
			x: 1000 - 420 - 8,
			y: 46,
			width: 420,
			height: 320,
		});
		jest.restoreAllMocks();
	});

	it("opens with the frame remembered by the browser", () => {
		localStorage.setItem(
			FRAME_KEY,
			JSON.stringify({ x: 12, y: 60, width: 500, height: 350 }),
		);
		setup();
		expect(screen.getByRole("dialog")).toHaveStyle({
			width: "500px",
			height: "350px",
			left: "12px",
			top: "60px",
		});
	});
});
