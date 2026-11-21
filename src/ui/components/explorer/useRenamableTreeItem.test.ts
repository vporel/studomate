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

	it("suit un changement externe du nom quand il n'est pas en édition", () => {
		let name = "Page";
		const { result, rerender } = renderHook(() =>
			useRenamableTreeItem({ name, designing: true, onRename: jest.fn() }),
		);

		name = "Sorties";
		rerender();

		expect(result.current.inputProps.value).toBe("Sorties");
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

describe("useRenamableTreeItem F2", () => {
	const keyEvent = (key: string, sameTarget = true) => {
		const el = document.createElement("li");
		return {
			key,
			target: sameTarget ? el : document.createElement("input"),
			currentTarget: el,
			preventDefault: jest.fn(),
			stopPropagation: jest.fn(),
		} as unknown as React.KeyboardEvent<HTMLElement>;
	};

	it("passe en édition sur F2 en mode conception", () => {
		const { result } = setup();
		const e = keyEvent("F2");

		act(() => result.current.onKeyDown(e));

		expect(result.current.labelMode).toBe("edit");
		expect(e.preventDefault).toHaveBeenCalled();
	});

	it("ignore F2 hors mode conception", () => {
		const { result } = setup({ designing: false });

		act(() => result.current.onKeyDown(keyEvent("F2")));

		expect(result.current.labelMode).toBe("normal");
	});

	it("ignore les autres touches", () => {
		const { result } = setup();

		act(() => result.current.onKeyDown(keyEvent("Enter")));

		expect(result.current.labelMode).toBe("normal");
	});

	it("ignore F2 venant d'un élément enfant", () => {
		const { result } = setup();

		act(() => result.current.onKeyDown(keyEvent("F2", false)));

		expect(result.current.labelMode).toBe("normal");
	});
});

describe("useRenamableTreeItem Delete", () => {
	const keyEvent = (key: string, sameTarget = true) => {
		const el = document.createElement("li");
		return {
			key,
			target: sameTarget ? el : document.createElement("input"),
			currentTarget: el,
			preventDefault: jest.fn(),
			stopPropagation: jest.fn(),
		} as unknown as React.KeyboardEvent<HTMLElement>;
	};

	const setupDelete = (designing = true) => {
		const onDelete = jest.fn();
		const hook = renderHook(() =>
			useRenamableTreeItem({
				name: "Page",
				designing,
				onRename: jest.fn(),
				onDelete,
			}),
		);
		return { ...hook, onDelete };
	};

	it("appelle onDelete sur Suppr et consomme l'évènement", () => {
		const { result, onDelete } = setupDelete();
		const e = keyEvent("Delete");

		act(() => result.current.onKeyDown(e));

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(e.stopPropagation).toHaveBeenCalled();
	});

	it("ignore Retour arrière", () => {
		const { result, onDelete } = setupDelete();

		act(() => result.current.onKeyDown(keyEvent("Backspace")));

		expect(onDelete).not.toHaveBeenCalled();
	});

	it("ignore Suppr hors mode conception", () => {
		const { result, onDelete } = setupDelete(false);

		act(() => result.current.onKeyDown(keyEvent("Delete")));

		expect(onDelete).not.toHaveBeenCalled();
	});

	it("ignore Suppr venant d'un élément enfant", () => {
		const { result, onDelete } = setupDelete();

		act(() => result.current.onKeyDown(keyEvent("Delete", false)));

		expect(onDelete).not.toHaveBeenCalled();
	});

	it("ne fait rien sans onDelete", () => {
		const { result } = setup();
		const e = keyEvent("Delete");

		act(() => result.current.onKeyDown(e));

		expect(e.preventDefault).not.toHaveBeenCalled();
	});
});
