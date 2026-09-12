/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { ChangeEvent, KeyboardEvent } from "react";
import useCommittedField from "./useCommittedField";

const change = (v: string) =>
	({ target: { value: v } }) as ChangeEvent<HTMLInputElement>;

describe("useCommittedField", () => {
	it("garde la frappe locale et ne commite qu'au blur", () => {
		const onCommit = jest.fn();
		const { result } = renderHook(() =>
			useCommittedField({ value: "a", onCommit }),
		);

		act(() => result.current.onChange(change("abc")));
		expect(result.current.value).toBe("abc");
		expect(onCommit).not.toHaveBeenCalled();

		act(() => result.current.onBlur());
		expect(onCommit).toHaveBeenCalledWith("abc");
	});

	it("ne commite pas une valeur inchangée", () => {
		const onCommit = jest.fn();
		const { result } = renderHook(() =>
			useCommittedField({ value: "a", onCommit }),
		);
		act(() => result.current.onChange(change("a")));
		act(() => result.current.onBlur());
		expect(onCommit).not.toHaveBeenCalled();
	});

	it("resynchronise le champ quand `value` change en dehors", () => {
		const { result, rerender } = renderHook(
			({ value }) => useCommittedField({ value, onCommit: jest.fn() }),
			{ initialProps: { value: "a" } },
		);
		act(() => result.current.onChange(change("draft")));
		rerender({ value: "b" });
		expect(result.current.value).toBe("b");
	});

	it("revient à `value` quand `parse` renvoie null", () => {
		const onCommit = jest.fn();
		const { result } = renderHook(() =>
			useCommittedField<number>({
				value: 10,
				onCommit,
				parse: (t) => (t.trim() === "" || Number.isNaN(+t) ? null : +t),
			}),
		);
		act(() => result.current.onChange(change("")));
		act(() => result.current.onBlur());
		expect(onCommit).not.toHaveBeenCalled();
		expect(result.current.value).toBe("10");
	});

	it("revient à `value` quand `reject` refuse la valeur", () => {
		const onCommit = jest.fn();
		const { result } = renderHook(() =>
			useCommittedField({
				value: "ok",
				onCommit,
				reject: (v) => v === "taken",
			}),
		);
		act(() => result.current.onChange(change("taken")));
		act(() => result.current.onBlur());
		expect(onCommit).not.toHaveBeenCalled();
		expect(result.current.value).toBe("ok");
	});

	it("rappelle onEdit à chaque frappe puis avec null au blur", () => {
		const onEdit = jest.fn();
		const { result } = renderHook(() =>
			useCommittedField<number>({
				value: 1,
				onCommit: jest.fn(),
				parse: (t) => (Number.isNaN(+t) ? null : +t),
				onEdit,
			}),
		);
		act(() => result.current.onChange(change("5")));
		expect(onEdit).toHaveBeenLastCalledWith(5);
		act(() => result.current.onBlur());
		expect(onEdit).toHaveBeenLastCalledWith(null);
	});

	it("commite une saisie en cours au démontage", () => {
		const onCommit = jest.fn();
		const { result, unmount } = renderHook(() =>
			useCommittedField({ value: "a", onCommit }),
		);
		act(() => result.current.onChange(change("abc")));
		unmount();
		expect(onCommit).toHaveBeenCalledWith("abc");
	});

	it("ne commite rien au démontage sans saisie en cours", () => {
		const onCommit = jest.fn();
		const { unmount } = renderHook(() =>
			useCommittedField({ value: "a", onCommit }),
		);
		unmount();
		expect(onCommit).not.toHaveBeenCalled();
	});

	it("Entrée retire le focus", () => {
		const blur = jest.fn();
		const { result } = renderHook(() =>
			useCommittedField({ value: "a", onCommit: jest.fn() }),
		);
		result.current.onKeyDown({
			key: "Enter",
			currentTarget: { blur },
		} as unknown as KeyboardEvent<HTMLInputElement>);
		expect(blur).toHaveBeenCalled();
	});
});
