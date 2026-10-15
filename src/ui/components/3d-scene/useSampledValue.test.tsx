/** @jest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import useSampledValue from "./useSampledValue";

type State = { flag: boolean };
const selectFlag = (state: State) => state.flag;

describe("useSampledValue", () => {
	let frames: FrameRequestCallback[];
	const runFrame = () => {
		const pending = frames;
		frames = [];
		act(() => pending.forEach((callback) => callback(0)));
	};

	beforeEach(() => {
		frames = [];
		jest
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((callback) => frames.push(callback));
		jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
			frames = [];
		});
	});
	afterEach(() => jest.restoreAllMocks());

	it("returns the fallback while the scene has no state", () => {
		const { result } = renderHook(() =>
			useSampledValue(() => null, selectFlag, true),
		);
		runFrame();
		expect(result.current).toBe(true);
	});

	it("follows the selected value of the sampled state", () => {
		let state: State = { flag: false };
		const sample = () => state;
		const { result } = renderHook(() =>
			useSampledValue(sample, selectFlag, true),
		);

		runFrame();
		expect(result.current).toBe(false);

		state = { flag: true };
		runFrame();
		expect(result.current).toBe(true);
	});

	it("stops sampling once unmounted", () => {
		const sample = jest.fn(() => ({ flag: true }));
		const { unmount } = renderHook(() =>
			useSampledValue(sample, selectFlag, false),
		);
		runFrame();
		sample.mockClear();

		unmount();
		runFrame();

		expect(sample).not.toHaveBeenCalled();
	});

	it("follows a value that can be null", () => {
		let state: { count: number | null } = { count: null };
		const sample = () => state;
		const select = (s: { count: number | null }) => s.count;
		const { result } = renderHook(() => useSampledValue(sample, select, null));

		runFrame();
		expect(result.current).toBeNull();

		state = { count: 5 };
		runFrame();
		expect(result.current).toBe(5);
	});

	it("keeps the same object while the comparison says it did not change", () => {
		let state = { lit: ["a"] };
		const sample = () => state;
		const select = (s: { lit: string[] }) => s.lit;
		const sameLit = (a: string[], b: string[]) => a.join() === b.join();
		const { result } = renderHook(() =>
			useSampledValue(sample, select, [] as string[], sameLit),
		);
		runFrame();
		const first = result.current;

		state = { lit: ["a"] };
		runFrame();
		expect(result.current).toBe(first);

		state = { lit: ["a", "b"] };
		runFrame();
		expect(result.current).toEqual(["a", "b"]);
	});
});
