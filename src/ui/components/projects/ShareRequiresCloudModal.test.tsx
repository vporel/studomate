/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useProjectStore } from "./ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ShareRequiresCloudModal from "./ShareRequiresCloudModal";

jest.mock("./ProjectContext");

function setup({
	visible = true,
	setVisible = jest.fn(),
	moveToCloudAndShare = jest.fn().mockResolvedValue(undefined),
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { shareRequiresCloudModalVisible: visible },
			setShareRequiresCloudModalVisible: setVisible,
			moveToCloudAndShare,
		}),
	);
	render(<ShareRequiresCloudModal />);
	return { setVisible, moveToCloudAndShare };
}

describe("ShareRequiresCloudModal", () => {
	afterEach(() => jest.clearAllMocks());

	it("déclenche l'envoi cloud puis le partage au clic sur « Envoyer et partager »", async () => {
		const { moveToCloudAndShare } = setup();

		fireEvent.click(screen.getByText("Envoyer et partager"));

		await waitFor(() => expect(moveToCloudAndShare).toHaveBeenCalledTimes(1));
	});

	it("ferme la modale au clic sur « Annuler »", () => {
		const { setVisible } = setup();

		fireEvent.click(screen.getByText("Annuler"));

		expect(setVisible).toHaveBeenCalledWith(false);
	});
});
