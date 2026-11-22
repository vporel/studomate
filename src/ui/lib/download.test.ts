/**
 * @jest-environment jsdom
 */
import { downloadFile } from "./download";

describe("downloadFile", () => {
	const click = jest.fn();
	let anchor: HTMLAnchorElement;

	beforeEach(() => {
		jest.useFakeTimers();
		URL.createObjectURL = jest.fn(() => "blob:file");
		URL.revokeObjectURL = jest.fn();
		anchor = document.createElement("a");
		anchor.click = click;
		jest.spyOn(document, "createElement").mockReturnValue(anchor);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it("clicks a link pointing at the data under the requested name", () => {
		downloadFile("data", "image.png", "image/png");

		expect(anchor.download).toBe("image.png");
		expect(anchor.href).toContain("blob:file");
		expect(click).toHaveBeenCalledTimes(1);
	});

	it("revokes the object URL only after a delay", () => {
		downloadFile("data", "image.png", "image/png");
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();

		jest.advanceTimersByTime(10_000);

		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:file");
	});
});
