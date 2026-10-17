/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HardwareFirmwareDialog from "./HardwareFirmwareDialog";
import { useProjectStore } from "./ProjectContext";

jest.mock("./ProjectContext");

function setup(firmware: object) {
	const hardwareLinkManager = { answerFirmwareInstall: jest.fn() };
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ hardwareFirmware: firmware, hardwareLinkManager }),
	);
	const view = renderWithI18n(<HardwareFirmwareDialog />);
	return { hardwareLinkManager, ...view };
}

describe("HardwareFirmwareDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("renders nothing when idle", () => {
		setup({ phase: "idle", reason: null, progress: null });
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("asks to install a missing firmware, warning that the program is erased", () => {
		setup({ phase: "confirming", reason: "missing", progress: null });
		expect(
			screen.getByText("Installer le firmware Studomate ?"),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Le programme actuel de la carte sera effacé/),
		).toBeInTheDocument();
	});

	it("proposes an update for an outdated firmware", () => {
		setup({ phase: "confirming", reason: "outdated", progress: null });
		expect(
			screen.getByText("Mettre à jour le firmware Studomate ?"),
		).toBeInTheDocument();
	});

	it("answers yes with Installer and no with Annuler", () => {
		const { hardwareLinkManager } = setup({
			phase: "confirming",
			reason: "missing",
			progress: null,
		});

		fireEvent.click(screen.getByRole("button", { name: "Installer" }));
		expect(hardwareLinkManager.answerFirmwareInstall).toHaveBeenLastCalledWith(
			true,
		);

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		expect(hardwareLinkManager.answerFirmwareInstall).toHaveBeenLastCalledWith(
			false,
		);
	});

	it("treats closing the dialog as a refusal", () => {
		const { hardwareLinkManager } = setup({
			phase: "confirming",
			reason: "missing",
			progress: null,
		});
		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(hardwareLinkManager.answerFirmwareInstall).toHaveBeenCalledWith(
			false,
		);
	});

	it("shows an indeterminate bar while preparing", () => {
		setup({ phase: "flashing", reason: "missing", progress: null });
		expect(screen.getByText("Préparation...")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).not.toHaveAttribute(
			"aria-valuenow",
		);
	});

	it("maps the write phase to the first half of the bar", () => {
		setup({
			phase: "flashing",
			reason: "missing",
			progress: { phase: "write", done: 10, total: 20 },
		});
		expect(screen.getByText("Écriture : page 10 sur 20")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"25",
		);
	});

	it("maps the verify phase to the second half of the bar", () => {
		setup({
			phase: "flashing",
			reason: "missing",
			progress: { phase: "verify", done: 20, total: 20 },
		});
		expect(
			screen.getByText("Vérification : page 20 sur 20"),
		).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"100",
		);
	});

	it("is blocking: no button, and Escape does not answer", () => {
		const { hardwareLinkManager } = setup({
			phase: "flashing",
			reason: "missing",
			progress: null,
		});
		expect(screen.queryByRole("button")).toBeNull();
		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(hardwareLinkManager.answerFirmwareInstall).not.toHaveBeenCalled();
		expect(screen.getByText(/Ne débranchez pas la carte/)).toBeInTheDocument();
	});
});
