/**
 * @jest-environment jsdom
 */
import { Scene } from "@/ui/lib/drawing/draw-op";
import {
	fitRasterScale,
	sceneToPngBytes,
	sceneToSvgString,
} from "./scene-image";

const scene: Scene = {
	ops: [{ op: "line", x1: 0, y1: 0, x2: 10, y2: 10 }],
	width: 200,
	height: 100,
};

describe("fitRasterScale", () => {
	it("keeps the desired scale for a normal-sized scene", () => {
		expect(fitRasterScale(400, 300)).toBe(6);
	});

	it("lowers the scale for an A4 page so the canvas area stays within the limit", () => {
		const scale = fitRasterScale(794, 1123);
		expect(scale).toBeCloseTo(Math.sqrt(16_000_000 / (794 * 1123)));
		expect(scale).toBeLessThan(6);
	});

	it("lowers the scale so the longest side stays within the canvas limit", () => {
		const scale = fitRasterScale(10000, 100);
		expect(scale).toBeCloseTo(8192 / 10000);
	});

	it("lowers the scale so the canvas area stays within the limit", () => {
		const scale = fitRasterScale(6000, 6000);
		expect(6000 * scale * 6000 * scale).toBeLessThanOrEqual(16_000_001);
	});

	it("keeps the desired scale for a degenerate scene", () => {
		expect(fitRasterScale(0, 0, 3)).toBe(3);
	});
});

describe("sceneToSvgString", () => {
	it("serializes the scene as a standalone SVG on a white background", () => {
		const svg = sceneToSvgString(scene);

		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(svg).toContain('viewBox="0 0 200 100"');
		expect(svg).toContain('fill="#ffffff"');
	});
});

describe("sceneToPngBytes", () => {
	const drawImage = jest.fn();
	const createObjectURL = jest.fn(() => "blob:svg");
	const revokeObjectURL = jest.fn();
	let canvas: { width: number; height: number };
	let imageBehaviour: "load" | "error";
	let encoded: Blob | null;

	beforeEach(() => {
		jest.clearAllMocks();
		imageBehaviour = "load";
		encoded = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
		Object.defineProperty(encoded, "arrayBuffer", {
			value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
		});
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;
		jest.spyOn(document, "createElement").mockImplementation(((tag: string) => {
			if (tag !== "canvas") throw new Error(`unexpected <${tag}>`);
			canvas = {
				width: 0,
				height: 0,
				getContext: () => ({ drawImage }),
				toBlob: (cb: (b: Blob | null) => void) => cb(encoded),
			} as never;
			return canvas as never;
		}) as never);
		(global as unknown as { Image: unknown }).Image = class {
			onload: () => void = () => {};
			onerror: () => void = () => {};
			set src(_: string) {
				queueMicrotask(() =>
					imageBehaviour === "load" ? this.onload() : this.onerror(),
				);
			}
		};
	});

	afterEach(() => jest.restoreAllMocks());

	it("draws the SVG on a canvas at six times the scene size and returns the PNG bytes", async () => {
		const bytes = await sceneToPngBytes(scene);

		expect(canvas.width).toBe(1200);
		expect(canvas.height).toBe(600);
		expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 600);
		expect(Array.from(bytes)).toEqual([1, 2, 3]);
	});

	it("releases the object URL once done", async () => {
		await sceneToPngBytes(scene);

		expect(revokeObjectURL).toHaveBeenCalledWith("blob:svg");
	});

	it("rejects and still releases the URL when the SVG cannot be loaded", async () => {
		imageBehaviour = "error";

		await expect(sceneToPngBytes(scene)).rejects.toThrow();
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:svg");
	});

	it("rejects when the canvas cannot encode a PNG", async () => {
		encoded = null;

		await expect(sceneToPngBytes(scene)).rejects.toThrow("PNG encoding failed");
	});
});
