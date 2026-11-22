/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { ConvertBlockParams } from "@/schemas/ladder/block.schema";
import ConvertTypeSelects from "./ConvertTypeSelects";

function setup(
	types: Pick<ConvertBlockParams, "inType" | "outType">,
	disabled = false,
) {
	const params: ConvertBlockParams = { in: "A", out: "B", ...types };
	const onChange = jest.fn();
	renderWithI18n(
		<ConvertTypeSelects
			params={params}
			onChange={onChange}
			disabled={disabled}
		/>,
	);
	return { onChange };
}

const outSelect = () =>
	screen.getByRole("combobox", { name: "Type de la cible de la conversion" });
const inSelect = () =>
	screen.getByRole("combobox", { name: "Type de la source de la conversion" });

function openedOptions(select: HTMLElement) {
	fireEvent.mouseDown(select);
	return within(screen.getByRole("listbox"))
		.getAllByRole("option")
		.map((option) => option.textContent);
}

describe("ConvertTypeSelects", () => {
	it("affiche les types source et cible séparés par TO", () => {
		setup({ inType: "INT", outType: "REAL" });

		expect(inSelect()).toHaveTextContent("INT");
		expect(screen.getByText("TO")).toBeInTheDocument();
		expect(outSelect()).toHaveTextContent("REAL");
	});

	it("propose tous les types convertibles en source", () => {
		setup({ inType: "INT", outType: "REAL" });

		expect(openedOptions(inSelect())).toEqual([
			"INT",
			"DINT",
			"WORD",
			"DWORD",
			"REAL",
		]);
	});

	it("ne propose en cible que les conversions supportées depuis un entier", () => {
		setup({ inType: "INT", outType: "REAL" });

		expect(openedOptions(outSelect())).toEqual([
			"DINT",
			"WORD",
			"DWORD",
			"REAL",
		]);
	});

	it("ne propose pas de chaîne de bits en cible depuis REAL", () => {
		setup({ inType: "REAL", outType: "INT" });

		expect(openedOptions(outSelect())).toEqual(["INT", "DINT"]);
	});

	it("ne propose pas REAL en cible depuis une chaîne de bits", () => {
		setup({ inType: "WORD", outType: "INT" });

		expect(openedOptions(outSelect())).toEqual(["INT", "DINT", "DWORD"]);
	});

	it("change le type cible sans toucher à la source", () => {
		const { onChange } = setup({ inType: "INT", outType: "REAL" });

		fireEvent.mouseDown(outSelect());
		fireEvent.click(screen.getByRole("option", { name: "DINT" }));

		expect(onChange).toHaveBeenCalledWith({
			in: "A",
			out: "B",
			inType: "INT",
			outType: "DINT",
		});
	});

	it("change le type source en conservant une cible toujours supportée", () => {
		const { onChange } = setup({ inType: "INT", outType: "DINT" });

		fireEvent.mouseDown(inSelect());
		fireEvent.click(screen.getByRole("option", { name: "WORD" }));

		expect(onChange).toHaveBeenCalledWith({
			in: "A",
			out: "B",
			inType: "WORD",
			outType: "DINT",
		});
	});

	it("replie la cible sur la première conversion supportée quand elle ne l'est plus", () => {
		const { onChange } = setup({ inType: "INT", outType: "REAL" });

		fireEvent.mouseDown(inSelect());
		fireEvent.click(screen.getByRole("option", { name: "WORD" }));

		expect(onChange).toHaveBeenCalledWith({
			in: "A",
			out: "B",
			inType: "WORD",
			outType: "INT",
		});
	});

	it("désactive les deux selects quand le projet n'est pas modifiable", () => {
		const { onChange } = setup({ inType: "INT", outType: "REAL" }, true);

		fireEvent.mouseDown(inSelect());
		fireEvent.mouseDown(outSelect());

		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});
});
