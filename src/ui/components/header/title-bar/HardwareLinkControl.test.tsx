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
	kind = "virtual",
	boardMode = "idle",
	programPresent = false,
	upload = { phase: "idle", sentBytes: 0, totalBytes: 0 },
}: {
	modelId?: string | null;
	status?: string;
	flashing?: boolean;
	mode?: string;
	kind?: string;
	boardMode?: string;
	programPresent?: boolean;
	upload?: { phase: string; sentBytes: number; totalBytes: number };
} = {}) {
	const hardwareLinkManager = {
		link: jest.fn(),
		unlink: jest.fn(),
		uploadProgram: jest.fn(),
		runProgram: jest.fn(),
		stopProgram: jest.fn(),
	};
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { hardwareTarget: modelId ? { modelId } : null },
			hardwareLink: { status, drivenInputIds: [], boardMode, programPresent },
			hardwareFirmware: { phase: flashing ? "flashing" : "idle" },
			mode,
			simulationKind: kind,
			hardwareUpload: upload,
			hardwareLinkManager,
		}),
	);
	const view = renderWithI18n(<HardwareLinkControl />);
	return { hardwareLinkManager, ...view };
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const maybeButton = (name: string | RegExp) =>
	screen.queryByRole("button", { name });

describe("HardwareLinkControl", () => {
	beforeEach(() => (isWebSerialSupported as jest.Mock).mockReturnValue(true));
	afterEach(() => jest.clearAllMocks());

	it("renders nothing for a project without hardware target", () => {
		const { container } = setup({ modelId: null });
		expect(container).toBeEmptyDOMElement();
	});

	it("warns, instead of offering the board, in a browser without Web Serial", () => {
		(isWebSerialSupported as jest.Mock).mockReturnValue(false);
		setup();
		expect(screen.getByRole("img")).toBeInTheDocument();
		expect(maybeButton("Liaison en ligne")).toBeNull();
	});

	describe("without a link", () => {
		it("shows the name of the board and no badge, then the actions to load a program and to link", () => {
			setup();
			expect(screen.getByText("Arduino Uno R3")).toBeInTheDocument();
			expect(screen.queryByText("En ligne")).toBeNull();
			expect(button("Charger le programme dans la carte")).toBeEnabled();
			expect(button("Liaison en ligne")).toBeEnabled();
			expect(maybeButton("Fermer la liaison")).toBeNull();
			expect(maybeButton("Lancer le programme de la carte")).toBeNull();
		});

		it("links online", () => {
			const { hardwareLinkManager } = setup();
			fireEvent.click(button("Liaison en ligne"));
			expect(hardwareLinkManager.link).toHaveBeenCalledTimes(1);
		});

		it("loads the program, which opens a temporary link by itself", () => {
			const { hardwareLinkManager } = setup();
			fireEvent.click(button("Charger le programme dans la carte"));
			expect(hardwareLinkManager.uploadProgram).toHaveBeenCalledTimes(1);
		});

		it("cannot load the program outside Design mode", () => {
			setup({ mode: "SIMULATION" });
			expect(button("Charger le programme dans la carte")).toBeDisabled();
		});
	});

	describe("while connecting", () => {
		it("shows the progress, and locks the actions", () => {
			setup({ status: "connecting" });
			expect(screen.getByText("Connexion...")).toBeInTheDocument();
			expect(button("Liaison en ligne")).toBeDisabled();
			expect(button("Charger le programme dans la carte")).toBeDisabled();
		});

		it("says that the firmware is being installed", () => {
			setup({ status: "connecting", flashing: true });
			expect(
				screen.getByText("Installation du firmware..."),
			).toBeInTheDocument();
		});
	});

	describe("once linked", () => {
		it("shows an online badge for a board left as it is, and offers to close the link", () => {
			const { hardwareLinkManager } = setup({ status: "linked" });
			expect(screen.getByText("En ligne")).toBeInTheDocument();
			expect(maybeButton("Liaison en ligne")).toBeNull();

			fireEvent.click(button("Fermer la liaison"));

			expect(hardwareLinkManager.unlink).toHaveBeenCalledTimes(1);
		});

		it.each([
			["program-running", "Programme en cours"],
			["program-stopped", "Programme arrêté"],
			["remote-io", "Mode E/S réelles"],
		])("shows the badge of a board in %s", (boardMode, text) => {
			setup({ status: "linked", boardMode });
			expect(screen.getByText(text)).toBeInTheDocument();
		});

		it("shows an observation badge while the board is observed", () => {
			setup({
				status: "linked",
				mode: "SIMULATION",
				kind: "observation",
				boardMode: "program-running",
			});
			expect(screen.getByText("En observation")).toBeInTheDocument();
		});

		it("offers to start the stored program, and starts it", () => {
			const { hardwareLinkManager } = setup({
				status: "linked",
				programPresent: true,
			});
			fireEvent.click(button("Lancer le programme de la carte"));
			expect(hardwareLinkManager.runProgram).toHaveBeenCalledTimes(1);
			expect(maybeButton("Arrêter le programme de la carte")).toBeNull();
		});

		it("offers to start a stopped program", () => {
			setup({
				status: "linked",
				boardMode: "program-stopped",
				programPresent: true,
			});
			expect(button("Lancer le programme de la carte")).toBeEnabled();
		});

		it("offers to stop a running program, and stops it", () => {
			const { hardwareLinkManager } = setup({
				status: "linked",
				boardMode: "program-running",
				programPresent: true,
			});
			expect(maybeButton("Lancer le programme de la carte")).toBeNull();
			fireEvent.click(button("Arrêter le programme de la carte"));
			expect(hardwareLinkManager.stopProgram).toHaveBeenCalledTimes(1);
		});

		it("has no start button when the board holds no program", () => {
			setup({ status: "linked", programPresent: false });
			expect(maybeButton("Lancer le programme de la carte")).toBeNull();
		});

		it("leaves the program and the link alone while a mode uses the board", () => {
			setup({
				status: "linked",
				mode: "SIMULATION",
				kind: "hardware-io",
				boardMode: "remote-io",
				programPresent: true,
			});
			expect(button("Lancer le programme de la carte")).toBeDisabled();
			expect(button("Fermer la liaison")).toBeDisabled();
		});

		it("allows to start the program during a purely virtual simulation", () => {
			setup({
				status: "linked",
				mode: "SIMULATION",
				kind: "virtual",
				programPresent: true,
			});
			expect(button("Lancer le programme de la carte")).toBeEnabled();
		});
	});

	describe("while a program is loaded", () => {
		it("shows the progress and locks the actions", () => {
			setup({
				status: "linked",
				boardMode: "program-running",
				programPresent: true,
				upload: { phase: "uploading", sentBytes: 96, totalBytes: 384 },
			});
			expect(
				screen.getByText("Chargement du programme... 25 %"),
			).toBeInTheDocument();
			expect(button("Charger le programme dans la carte")).toBeDisabled();
			expect(button("Arrêter le programme de la carte")).toBeDisabled();
			expect(button("Fermer la liaison")).toBeDisabled();
		});

		it("shows the progress of a temporary link, which has no badge of its own", () => {
			setup({
				status: "disconnected",
				upload: { phase: "uploading", sentBytes: 0, totalBytes: 100 },
			});
			expect(
				screen.getByText("Chargement du programme... 0 %"),
			).toBeInTheDocument();
			expect(button("Liaison en ligne")).toBeDisabled();
		});
	});

	it("shows the name of the board whatever the state, and says the state without repeating it", () => {
		setup({ status: "linked" });
		expect(screen.getByText("Arduino Uno R3")).toBeInTheDocument();
		expect(screen.getByText("En ligne")).toBeInTheDocument();
	});

	it("falls back to the model id for an unknown model", () => {
		setup({ modelId: "inconnu", status: "linked" });
		expect(screen.getByText("inconnu")).toBeInTheDocument();
	});
});
