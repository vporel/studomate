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
	mode = "DESIGN",
	upload = { phase: "idle", sentBytes: 0, totalBytes: 0 },
	boardMode = "remote-io",
	programPresent = false,
}: {
	boardMode?: string;
	programPresent?: boolean;
	modelId?: string | null;
	status?: string;
	flashing?: boolean;
	mode?: string;
	upload?: { phase: string; sentBytes: number; totalBytes: number };
} = {}) {
	const hardwareLinkManager = {
		link: jest.fn(),
		unlink: jest.fn(),
		uploadProgram: jest.fn(),
		resumeRemoteIo: jest.fn(),
		runProgram: jest.fn(),
		stopProgram: jest.fn(),
	};
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { hardwareTarget: modelId ? { modelId } : null },
			hardwareLink: { status, drivenInputIds: [], boardMode, programPresent },
			hardwareFirmware: { phase: flashing ? "flashing" : "idle" },
			mode,
			hardwareUpload: upload,
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
		expect(screen.getByText("Arduino Uno R3 lié en E/S")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Dissocier" }));

		expect(hardwareLinkManager.unlink).toHaveBeenCalledTimes(1);
	});

	it("sends the program from the linked board in design mode", () => {
		const { hardwareLinkManager } = setup({ status: "linked" });

		fireEvent.click(
			screen.getByRole("button", { name: "Téléverser le programme" }),
		);

		expect(hardwareLinkManager.uploadProgram).toHaveBeenCalledTimes(1);
	});

	it("does not offer to send the program while simulating or without a link", () => {
		setup({ status: "linked", mode: "SIMULATION" });
		expect(
			screen.getByRole("button", { name: "Téléverser le programme" }),
		).toBeDisabled();
	});

	it("has no send button when the board is not linked", () => {
		setup();
		expect(
			screen.queryByRole("button", { name: "Téléverser le programme" }),
		).toBeNull();
	});

	it("shows the progress of the transfer and locks the buttons", () => {
		setup({
			status: "linked",
			upload: { phase: "uploading", sentBytes: 96, totalBytes: 384 },
		});
		expect(
			screen.getByText("Téléversement du programme... 25 %"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Téléverser le programme" }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Dissocier" })).toBeDisabled();
	});

	it("shows that the board runs its program and lets the user take back control", () => {
		const { hardwareLinkManager } = setup({
			status: "linked",
			boardMode: "program-running",
			programPresent: true,
		});
		expect(
			screen.getByText("Arduino Uno R3 exécute son programme"),
		).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Utiliser la carte en E/S" }),
		);

		expect(hardwareLinkManager.resumeRemoteIo).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("button", { name: "Téléverser le programme" }),
		).toBeEnabled();
	});

	it("stops the running program, and offers no start button meanwhile", () => {
		const { hardwareLinkManager } = setup({
			status: "linked",
			boardMode: "program-running",
			programPresent: true,
		});
		expect(
			screen.queryByRole("button", { name: "Lancer le programme de la carte" }),
		).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: "Arrêter le programme de la carte" }),
		);

		expect(hardwareLinkManager.stopProgram).toHaveBeenCalledTimes(1);
	});

	it("starts a stopped program and shows that it is stopped", () => {
		const { hardwareLinkManager } = setup({
			status: "linked",
			boardMode: "program-stopped",
			programPresent: true,
		});
		expect(
			screen.getByText("Arduino Uno R3 : programme arrêté"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", {
				name: "Arrêter le programme de la carte",
			}),
		).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: "Lancer le programme de la carte" }),
		);

		expect(hardwareLinkManager.runProgram).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("button", { name: "Utiliser la carte en E/S" }),
		).toBeInTheDocument();
	});

	it("offers to start the program stored in a board serving the pins", () => {
		const { hardwareLinkManager } = setup({
			status: "linked",
			boardMode: "remote-io",
			programPresent: true,
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Lancer le programme de la carte" }),
		);
		expect(hardwareLinkManager.runProgram).toHaveBeenCalledTimes(1);
	});

	it("has no start button when the board holds no program", () => {
		setup({ status: "linked", programPresent: false });
		expect(
			screen.queryByRole("button", { name: "Lancer le programme de la carte" }),
		).toBeNull();
	});

	it("has no take-back button when the board serves the pins", () => {
		setup({ status: "linked" });
		expect(
			screen.queryByRole("button", { name: "Utiliser la carte en E/S" }),
		).toBeNull();
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
