/**
 * @jest-environment jsdom
 */
import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HardwareLinkControl from "./HardwareLinkControl";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/hardware/arduino/remote-io/web-serial.transport", () => ({
	isWebSerialSupported: jest.fn(() => true),
}));

function setup({
	modelId = "arduino-uno-r3" as string | null,
	status = "disconnected",
	flashing = false,
}: { modelId?: string | null; status?: string; flashing?: boolean } = {}) {
	const hardwareLinkManager = { link: jest.fn(), unlink: jest.fn() };
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { hardwareTarget: modelId ? { modelId } : null },
			hardwareLink: { status, drivenInputIds: [] },
			hardwareFirmware: { phase: flashing ? "flashing" : "idle" },
			hardwareLinkManager,
		}),
	);
	const view = renderWithI18n(<HardwareLinkControl />);
	return { hardwareLinkManager, ...view };
}

describe("HardwareLinkControl", () => {
	beforeEach(() => (isWebSerialSupported as jest.Mock).mockReturnValue(true));
	afterEach(() => jest.clearAllMocks());

	it("renders nothing for a project without hardware target", () => {
		const { container } = setup({ modelId: null });
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the disconnected badge and a link button, which links", () => {
		const { hardwareLinkManager } = setup();
		expect(screen.getByText("Arduino Uno R3 déconnecté")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Lier la carte" }));

		expect(hardwareLinkManager.link).toHaveBeenCalledTimes(1);
	});

	it("shows the connecting state with a disabled button", () => {
		setup({ status: "connecting" });
		expect(screen.getByText("Connexion...")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Lier la carte" }),
		).toBeDisabled();
	});

	it("shows the firmware upload while the board is being flashed", () => {
		setup({ status: "connecting", flashing: true });
		expect(
			screen.getByText("Téléversement du firmware..."),
		).toBeInTheDocument();
		expect(screen.queryByText("Connexion...")).toBeNull();
	});

	it("shows the linked badge and an unlink button, which unlinks", () => {
		const { hardwareLinkManager } = setup({ status: "linked" });
		expect(screen.getByText("Arduino Uno R3 lié")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Dissocier" }));

		expect(hardwareLinkManager.unlink).toHaveBeenCalledTimes(1);
	});

	it("falls back to the model id for an unknown model", () => {
		setup({ modelId: "inconnu" });
		expect(screen.getByText("inconnu déconnecté")).toBeInTheDocument();
	});

	it("replaces the button by a warning icon on a browser without Web Serial", () => {
		(isWebSerialSupported as jest.Mock).mockReturnValue(false);
		setup();
		expect(
			screen.getByRole("img", {
				name: "Liaison USB indisponible dans ce navigateur",
			}),
		).toBeInTheDocument();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
