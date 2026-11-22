/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import PlatformShareIcon from "./PlatformShareIcon";

const mockIsIos = jest.fn();
jest.mock("@/ui/lib/platform", () => ({ isIos: () => mockIsIos() }));

describe("PlatformShareIcon", () => {
	it("uses the Apple share icon on macOS and iOS", () => {
		mockIsIos.mockReturnValue(true);
		render(<PlatformShareIcon />);

		expect(screen.getByTestId("IosShareIcon")).toBeInTheDocument();
	});

	it("uses the usual share icon elsewhere", () => {
		mockIsIos.mockReturnValue(false);
		render(<PlatformShareIcon />);

		expect(screen.getByTestId("ShareIcon")).toBeInTheDocument();
		expect(screen.queryByTestId("IosShareIcon")).not.toBeInTheDocument();
	});
});
