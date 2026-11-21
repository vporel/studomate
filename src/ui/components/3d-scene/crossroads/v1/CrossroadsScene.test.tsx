/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import CrossroadsScene from "./CrossroadsScene";

type FrameCallback = () => void;
const frames: { callback: FrameCallback; priority?: number }[] = [];
const childReads: Record<string, () => unknown> = {};

jest.mock("@react-three/fiber", () => ({
	useFrame: (callback: FrameCallback, priority?: number) => {
		frames.push({ callback, priority });
	},
}));
jest.mock("@/ui/components/3d-scene/parts/Label", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./CrossroadsRoad", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./CrossroadsLights", () => ({
	__esModule: true,
	default: ({ read }: { read: () => unknown }) => {
		childReads.lights = read;
		return null;
	},
}));
jest.mock("./CrossroadsCars", () => ({
	__esModule: true,
	default: ({ read }: { read: () => unknown }) => {
		childReads.lanes = read;
		return null;
	},
}));

const state = {
	lights: { a: "green" },
	lanes: { a: [] },
	crash: null,
	accidents: 0,
};

describe("CrossroadsScene", () => {
	beforeAll(() => {
		Object.defineProperty(HTMLElement.prototype, "rotation", {
			value: { y: 0 },
			configurable: true,
		});
	});

	beforeEach(() => {
		frames.length = 0;
	});

	function mount(sample: () => unknown) {
		renderWithI18n(
			<CrossroadsScene sample={sample} interactive={false} send={jest.fn()} />,
		);
	}

	it("samples once per frame whatever the number of child reads", () => {
		const sample = jest.fn(() => state);
		mount(sample);
		frames[0].callback();
		childReads.lights();
		childReads.lights();
		childReads.lanes();
		expect(sample).toHaveBeenCalledTimes(1);
	});

	it("gives the children the lights and lanes of the frame", () => {
		mount(() => state);
		frames[0].callback();
		expect(childReads.lights()).toBe(state.lights);
		expect(childReads.lanes()).toBe(state.lanes);
	});

	it("runs its frame callback before the children's (negative priority)", () => {
		mount(() => state);
		expect(frames[0].priority).toBeLessThan(0);
	});

	it("gives null to the children when there is no state", () => {
		mount(() => null);
		frames[0].callback();
		expect(childReads.lights()).toBeNull();
		expect(childReads.lanes()).toBeNull();
	});
});
