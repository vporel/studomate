/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import BottomPanel from "./BottomPanel";

const mockBox = jest.fn();
jest.mock("@/ui/components/mui/ResizableFixedBox", () => ({
	__esModule: true,
	default: (props: { children: React.ReactNode }) => {
		mockBox(props);
		return <div data-testid="box">{props.children}</div>;
	},
}));

const setup = (onClose = jest.fn()) => {
	render(
		<BottomPanel
			title="Résultats"
			closeLabel="Fermer"
			closeAriaLabel="close-results"
			onClose={onClose}
		>
			<span>contenu</span>
		</BottomPanel>,
	);
	return { onClose };
};

describe("BottomPanel", () => {
	beforeEach(() => mockBox.mockClear());

	it("s'ancre en bas avec la taille et le décalage par défaut", () => {
		setup();

		expect(mockBox).toHaveBeenCalledWith(
			expect.objectContaining({
				position: "bottom",
				initialSize: 350,
				offset: 30,
			}),
		);
	});

	it("affiche le titre puis le contenu", () => {
		setup();

		const title = screen.getByText("Résultats");
		const content = screen.getByText("contenu");
		expect(
			title.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("ferme via le bouton identifié par son aria-label", () => {
		const { onClose } = setup();

		fireEvent.click(screen.getByLabelText("close-results"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
