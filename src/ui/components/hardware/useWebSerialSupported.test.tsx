/** @jest-environment jsdom */
import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import { render, renderHook } from "@testing-library/react";
import useWebSerialSupported from "./useWebSerialSupported";

jest.mock("@/hardware/arduino/remote-io/web-serial.transport", () => ({
	isWebSerialSupported: jest.fn(() => true),
}));

const mockSupported = isWebSerialSupported as jest.Mock;

describe("useWebSerialSupported", () => {
	it("returns true after mount when Web Serial is supported", () => {
		mockSupported.mockReturnValue(true);
		const { result } = renderHook(() => useWebSerialSupported());
		expect(result.current).toBe(true);
	});

	it("returns false after mount when Web Serial is not supported", () => {
		mockSupported.mockReturnValue(false);
		const { result } = renderHook(() => useWebSerialSupported());
		expect(result.current).toBe(false);
	});

	it("returns null on the first render, before effects run", () => {
		mockSupported.mockReturnValue(true);
		const renders: (boolean | null)[] = [];
		const Probe = () => {
			renders.push(useWebSerialSupported());
			return null;
		};
		render(<Probe />);
		expect(renders[0]).toBeNull();
		expect(renders[renders.length - 1]).toBe(true);
	});
});
