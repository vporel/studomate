import trackEvent from "@/ui/services/analytics";
import trackImageExported from "./track-image-exported";

jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe("trackImageExported", () => {
	it("records the image type and the program type", () => {
		trackImageExported({ format: "svg", programType: "ladder" });

		expect(trackEvent).toHaveBeenCalledWith("image-exported", {
			format: "svg",
			programType: "ladder",
		});
	});
});
