/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import BlockNameField from "./BlockNameField";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	value = "Tempo1",
	isNameTaken = () => false,
	onCommit = jest.fn(),
}: {
	value?: string;
	isNameTaken?: (name: string) => boolean;
	onCommit?: jest.Mock;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { isNameTaken } }),
	);
	render(<BlockNameField value={value} onCommit={onCommit} />);
	return { onCommit, input: screen.getByLabelText("Nom du bloc") };
}

describe("BlockNameField", () => {
	afterEach(() => jest.clearAllMocks());

	it("rend un champ épuré toujours éditable, pré-rempli", () => {
		const { input } = setup();
		expect(input).toHaveValue("Tempo1");
	});

	it("commit un nom valide à la validation par Entrée", () => {
		const { input, onCommit } = setup();
		fireEvent.change(input, { target: { value: "Tempo2" } });
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.blur(input);
		expect(onCommit).toHaveBeenCalledWith("Tempo2");
	});

	it("ignore un nom vidé et restaure l'ancien", () => {
		const { input, onCommit } = setup();
		fireEvent.change(input, { target: { value: "" } });
		fireEvent.blur(input);
		expect(onCommit).not.toHaveBeenCalled();
		expect(input).toHaveValue("Tempo1");
	});

	it("ignore un nom déjà utilisé dans le projet", () => {
		const { input, onCommit } = setup({
			isNameTaken: (name) => name === "Pris",
		});
		fireEvent.change(input, { target: { value: "Pris" } });
		fireEvent.blur(input);
		expect(onCommit).not.toHaveBeenCalled();
	});

	it("annule sur Échap sans commit et restaure l'ancien nom", () => {
		const { input, onCommit } = setup();
		fireEvent.change(input, { target: { value: "Tempo9" } });
		fireEvent.keyDown(input, { key: "Escape" });
		fireEvent.blur(input);
		expect(onCommit).not.toHaveBeenCalled();
		expect(input).toHaveValue("Tempo1");
	});
});
