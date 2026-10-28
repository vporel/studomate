/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { act, fireEvent } from "@testing-library/react";
import {
	ZOOM_MAX,
	ZOOM_MIN,
	ZOOM_STEP,
} from "@/ui/components/hmi/logic/constants";
import HmiPageContent from "./HmiPageContent";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/pages/Page", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
jest.mock("@/ui/components/hmi/toolbar/HmiWidgetToolbarItem", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./HmiCanvas", () => ({
	__esModule: true,
	default: ({ zoom }: { zoom: number }) => (
		<div data-testid="canvas" data-zoom={zoom.toFixed(2)} />
	),
}));

let resizeCallbacks: (() => void)[] = [];
let areaSize = { width: 800, height: 440 };

beforeEach(() => {
	resizeCallbacks = [];
	areaSize = { width: 800, height: 440 };
	global.ResizeObserver = class {
		private callback: () => void;
		constructor(callback: () => void) {
			this.callback = callback;
			resizeCallbacks.push(callback);
		}
		observe() {}
		unobserve() {}
		disconnect() {
			resizeCallbacks = resizeCallbacks.filter((c) => c !== this.callback);
		}
	} as unknown as typeof ResizeObserver;
	jest
		.spyOn(HTMLElement.prototype, "clientWidth", "get")
		.mockImplementation(() => areaSize.width);
	jest
		.spyOn(HTMLElement.prototype, "clientHeight", "get")
		.mockImplementation(() => areaSize.height);
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({ editingEnabled: false }),
	);
});

afterEach(() => jest.restoreAllMocks());

const zoomOf = (getByTestId: (id: string) => HTMLElement) =>
	getByTestId("canvas").dataset.zoom;

const wheel = (
	getByTestId: (id: string) => HTMLElement,
	init: WheelEventInit,
) => fireEvent.wheel(getByTestId("canvas"), { bubbles: true, ...init });

const zoomOutTimes = (
	getByLabelText: (label: string) => HTMLElement,
	times: number,
) => {
	for (let i = 0; i < times; i++)
		fireEvent.click(getByLabelText("Zoom arrière"));
};

const resize = (width: number, height: number) => {
	areaSize = { width, height };
	act(() => resizeCallbacks.forEach((callback) => callback()));
};

describe("HmiPageContent", () => {
	it("keeps 100 % and the usual floor when it does not fit the container", () => {
		const { getByTestId, getByLabelText } = renderWithI18n(
			<HmiPageContent hmiPageId="p" />,
		);

		expect(zoomOf(getByTestId)).toBe("1.00");
		zoomOutTimes(getByLabelText, 10);
		expect(zoomOf(getByTestId)).toBe(ZOOM_MIN.toFixed(2));
		expect(resizeCallbacks).toHaveLength(0);
	});

	describe("Ctrl/Cmd + molette", () => {
		it("zoome sur toute la zone de défilement, au-dessus du canevas comme autour", () => {
			const { getByTestId } = renderWithI18n(<HmiPageContent hmiPageId="p" />);
			const area = getByTestId("canvas").parentElement!;

			wheel(getByTestId, { ctrlKey: true, deltaY: -100 });
			expect(zoomOf(getByTestId)).toBe((1 + ZOOM_STEP).toFixed(2));

			fireEvent.wheel(area, { ctrlKey: true, deltaY: 100 });
			expect(zoomOf(getByTestId)).toBe("1.00");
		});

		it("accepte Cmd", () => {
			const { getByTestId } = renderWithI18n(<HmiPageContent hmiPageId="p" />);

			wheel(getByTestId, { metaKey: true, deltaY: -100 });

			expect(zoomOf(getByTestId)).toBe((1 + ZOOM_STEP).toFixed(2));
		});

		it("laisse la molette seule défiler", () => {
			const { getByTestId } = renderWithI18n(<HmiPageContent hmiPageId="p" />);

			wheel(getByTestId, { deltaY: -100 });

			expect(zoomOf(getByTestId)).toBe("1.00");
		});

		it("reste dans les bornes du zoom", () => {
			const { getByTestId } = renderWithI18n(<HmiPageContent hmiPageId="p" />);

			for (let i = 0; i < 30; i++)
				wheel(getByTestId, { ctrlKey: true, deltaY: -100 });
			expect(zoomOf(getByTestId)).toBe(ZOOM_MAX.toFixed(2));

			for (let i = 0; i < 30; i++)
				wheel(getByTestId, { ctrlKey: true, deltaY: 100 });
			expect(zoomOf(getByTestId)).toBe(ZOOM_MIN.toFixed(2));
		});
	});

	describe("fitToContainer", () => {
		it("shows the whole canvas in the area, whichever side is tighter", () => {
			const { getByTestId, getByLabelText } = renderWithI18n(
				<HmiPageContent hmiPageId="p" fitToContainer />,
			);
			act(() => resizeCallbacks.forEach((callback) => callback()));

			expect(zoomOf(getByTestId)).toBe("0.61");
			zoomOutTimes(getByLabelText, 10);
			expect(zoomOf(getByTestId)).toBe("0.50");
		});

		it("follows the size of the container", () => {
			const { getByTestId } = renderWithI18n(
				<HmiPageContent hmiPageId="p" fitToContainer />,
			);
			resize(1400, 900);
			expect(zoomOf(getByTestId)).toBe("1.00");

			resize(300, 200);
			expect(zoomOf(getByTestId)).toBe("0.50");
		});

		it("leaves room for the editing sidebar", () => {
			(useProjectStore as jest.Mock).mockImplementation(
				selectorImplementation({ editingEnabled: true }),
			);
			const { getByTestId } = renderWithI18n(
				<HmiPageContent hmiPageId="p" fitToContainer />,
			);
			resize(1400, 900);

			expect(zoomOf(getByTestId)).toBe("1.00");
			resize(1200, 900);
			expect(Number(zoomOf(getByTestId))).toBeCloseTo(0.84, 2);
		});

		it("stops following once the user sets the zoom, and follows again on the percentage", () => {
			const { getByTestId, getByText } = renderWithI18n(
				<HmiPageContent hmiPageId="p" fitToContainer />,
			);
			resize(1400, 900);

			wheel(getByTestId, { ctrlKey: true, deltaY: 100 });
			expect(zoomOf(getByTestId)).toBe("0.90");

			resize(300, 200);
			expect(zoomOf(getByTestId)).toBe("0.90");

			fireEvent.click(getByText("90%"));
			resize(300, 200);
			expect(zoomOf(getByTestId)).toBe("0.50");
		});
	});
});
