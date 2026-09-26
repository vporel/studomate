/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import HmiFloatingPane from "./HmiFloatingPane";

const setup = (props = {}) => {
	const onClose = jest.fn();
	renderWithI18n(
		<HmiFloatingPane title="Titre" onClose={onClose} width="500px" {...props}>
			<span>contenu</span>
		</HmiFloatingPane>,
	);
	return { onClose };
};

describe("HmiFloatingPane", () => {
	it("affiche le titre et le contenu", () => {
		setup();

		expect(screen.getByText("Titre")).toBeInTheDocument();
		expect(screen.getByText("contenu")).toBeInTheDocument();
	});

	it("ferme via le bouton de fermeture", () => {
		const { onClose } = setup();

		fireEvent.click(screen.getByRole("button"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("ferme via Échap", () => {
		const { onClose } = setup();

		fireEvent.keyDown(screen.getByText("contenu"), { key: "Escape" });

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("applique width, height et maxHeight au conteneur", () => {
		setup({ height: "300px", maxHeight: "400px" });

		const paper = screen.getByText("Titre").closest(".MuiPaper-root");
		expect(paper).toHaveStyle({
			width: "500px",
			height: "300px",
			maxHeight: "400px",
		});
	});
});
