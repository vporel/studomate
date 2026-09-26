/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useRenamableTreeItem } from "./useRenamableTreeItem";

function setup({ designing = true, name = "Page" } = {}) {
	const onRename = jest.fn();
	const hook = renderHook(() =>
		useRenamableTreeItem({ name, designing, onRename }),
	);
	return { ...hook, onRename };
}

const type = (result: ReturnType<typeof setup>["result"], value: string) =>
	act(() =>
		result.current.inputProps.onChange({
			target: { value },
		} as React.ChangeEvent<HTMLInputElement>),
	);

describe("useRenamableTreeItem", () => {
	it("démarre en mode normal", () => {
		const { result } = setup();

		expect(result.current.labelMode).toBe("normal");
		expect(result.current.inputProps.value).toBe("Page");
	});

	it("passe en édition au double-clic en mode conception", () => {
		const { result } = setup();

		act(() => result.current.onDoubleClick());

		expect(result.current.labelMode).toBe("edit");
	});

	it("ignore le double-clic hors mode conception", () => {
		const { result } = setup({ designing: false });

		act(() => result.current.onDoubleClick());

		expect(result.current.labelMode).toBe("normal");
	});

	it("startEditing passe en édition", () => {
		const { result } = setup();

		act(() => result.current.startEditing());

		expect(result.current.labelMode).toBe("edit");
	});

	it("suit la saisie dans inputProps.value", () => {
		const { result } = setup();

		type(result, "Nouveau");

		expect(result.current.inputProps.value).toBe("Nouveau");
	});

	it.each(["Enter", "Escape"])(
		"%s valide le nom saisi (rogné) et revient en mode normal",
		(key) => {
			const { result, onRename } = setup();
			act(() => result.current.startEditing());
			type(result, "  Nouveau  ");

			act(() =>
				result.current.inputProps.onKeyDown({ key } as React.KeyboardEvent),
			);

			expect(onRename).toHaveBeenCalledWith("Nouveau");
			expect(result.current.labelMode).toBe("normal");
		},
	);

	it("valide à la perte de focus", () => {
		const { result, onRename } = setup();
		act(() => result.current.startEditing());
		type(result, "Nouveau");

		act(() => result.current.inputProps.onBlur());

		expect(onRename).toHaveBeenCalledWith("Nouveau");
		expect(result.current.labelMode).toBe("normal");
	});

	it("ne valide pas sur une autre touche", () => {
		const { result, onRename } = setup();
		act(() => result.current.startEditing());

		act(() =>
			result.current.inputProps.onKeyDown({ key: "a" } as React.KeyboardEvent),
		);

		expect(onRename).not.toHaveBeenCalled();
		expect(result.current.labelMode).toBe("edit");
	});

	it("renomme avec le nom courant quand la saisie est vide", () => {
		const { result, onRename } = setup({ name: "Page" });
		act(() => result.current.startEditing());
		type(result, "   ");

		act(() => result.current.inputProps.onBlur());

		expect(onRename).toHaveBeenCalledWith("Page");
	});
});
