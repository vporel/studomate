/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import OperatorSelect from "./OperatorSelect";

const OPERATORS = ["<", "=", ">"] as const;

function setup(value: (typeof OPERATORS)[number] = "=") {
	const onChange = jest.fn();
	render(
		<OperatorSelect
			value={value}
			onChange={onChange}
			operators={OPERATORS}
			ariaLabel="Opérateur"
		/>,
	);
	return { onChange };
}

describe("OperatorSelect", () => {
	it("affiche l'opérateur courant avec son aria-label", () => {
		setup(">");

		expect(
			screen.getByRole("combobox", { name: "Opérateur" }),
		).toHaveTextContent(">");
	});

	it("liste tous les opérateurs à l'ouverture du menu", () => {
		setup();

		fireEvent.mouseDown(screen.getByRole("combobox"));

		const options = within(screen.getByRole("listbox")).getAllByRole("option");
		expect(options.map((option) => option.textContent)).toEqual([...OPERATORS]);
	});

	it("appelle onChange avec l'opérateur choisi", () => {
		const { onChange } = setup("=");

		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(screen.getByRole("option", { name: "<" }));

		expect(onChange).toHaveBeenCalledWith("<");
	});

	it("ne peut pas être ouvert quand il est désactivé", () => {
		const onChange = jest.fn();
		render(
			<OperatorSelect
				value="="
				onChange={onChange}
				operators={OPERATORS}
				ariaLabel="Opérateur"
				disabled
			/>,
		);

		fireEvent.mouseDown(screen.getByRole("combobox"));

		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("n'appelle pas onChange quand on rechoisit l'opérateur courant", () => {
		const { onChange } = setup("=");

		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(screen.getByRole("option", { name: "=" }));

		expect(onChange).not.toHaveBeenCalled();
	});

	it("n'expose pas le mousedown à un parent (déplacement du nœud)", () => {
		const onParentMouseDown = jest.fn();
		render(
			<div onMouseDown={onParentMouseDown}>
				<OperatorSelect
					value="="
					onChange={jest.fn()}
					operators={OPERATORS}
					ariaLabel="Opérateur"
				/>
			</div>,
		);

		fireEvent.mouseDown(screen.getByRole("combobox"));

		expect(onParentMouseDown).not.toHaveBeenCalled();
	});

	it("porte la classe nodrag", () => {
		const { container } = render(
			<OperatorSelect
				value="="
				onChange={jest.fn()}
				operators={OPERATORS}
				ariaLabel="Opérateur"
			/>,
		);

		expect(container.querySelector(".nodrag")).not.toBeNull();
	});
});
