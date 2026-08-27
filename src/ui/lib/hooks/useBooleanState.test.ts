/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import useBooleanState from "./useBooleanState";

describe("useBooleanState", () => {
	it("initializes with the given value", () => {
		const { result } = renderHook(() => useBooleanState(true));
		expect(result.current[0]).toBe(true);
	});

	it("sets the value to true", () => {
		const { result } = renderHook(() => useBooleanState(false));
		act(() => result.current[1]());
		expect(result.current[0]).toBe(true);
	});

	it("resets the value to false", () => {
		const { result } = renderHook(() => useBooleanState(true));
		act(() => result.current[2]());
		expect(result.current[0]).toBe(false);
	});
});
