/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HardwareObservationDialog from "./HardwareObservationDialog";

jest.mock("./ProjectContext");

function setup(phase: "idle" | "confirming") {
	const hardwareLinkManager = { answerObservationStart: jest.fn() };
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			hardwareObservation: { phase },
			hardwareLinkManager,
		}),
	);
	const view = renderWithI18n(<HardwareObservationDialog />);
	return { hardwareLinkManager, ...view };
}

describe("HardwareObservationDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("shows nothing unless the user is asked", () => {
		setup("idle");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("asks whether to start the stopped program of the board", () => {
		setup("confirming");
		expect(
			screen.getByText("Démarrer le programme de la carte ?"),
		).toBeInTheDocument();
		expect(
			screen.getByText(/repartira de son état initial/),
		).toBeInTheDocument();
	});

	it("starts the program when the user accepts", () => {
		const { hardwareLinkManager } = setup("confirming");
		fireEvent.click(screen.getByRole("button", { name: "Démarrer" }));
		expect(hardwareLinkManager.answerObservationStart).toHaveBeenCalledWith(
			true,
		);
	});

	it("leaves the board alone when the user cancels", () => {
		const { hardwareLinkManager } = setup("confirming");
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		expect(hardwareLinkManager.answerObservationStart).toHaveBeenCalledWith(
			false,
		);
	});

	it("counts closing the dialog as a refusal", () => {
		const { hardwareLinkManager } = setup("confirming");
		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(hardwareLinkManager.answerObservationStart).toHaveBeenCalledWith(
			false,
		);
	});
});
