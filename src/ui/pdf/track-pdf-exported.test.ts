import trackPdfExported from "./track-pdf-exported";

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockTrackEvent(...args),
}));

const mockNotify = jest.fn();
jest.mock("@/ui/services/feedback-prompt", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockNotify(...args),
}));

describe("trackPdfExported", () => {
	it("tracks the export and tells the feedback request about it", () => {
		trackPdfExported({ programs: 2, withVariablesTable: true });

		expect(mockTrackEvent).toHaveBeenCalledWith("pdf-exported", {
			programs: 2,
			withVariablesTable: true,
		});
		expect(mockNotify).toHaveBeenCalledWith("pdf-exported");
	});
});
