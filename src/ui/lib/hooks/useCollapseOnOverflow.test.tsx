/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import useCollapseOnOverflow from "./useCollapseOnOverflow";

let contentWidth = 0;
let elementWidth = 0;
let resizeCallbacks: (() => void)[] = [];
let observed: Element[] = [];

beforeEach(() => {
	contentWidth = 0;
	elementWidth = 0;
	resizeCallbacks = [];
	observed = [];
	global.ResizeObserver = class {
		constructor(callback: () => void) {
			resizeCallbacks.push(callback);
		}
		observe(element: Element) {
			observed.push(element);
		}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
	// An overflowing element reports its content width, a roomy one its own width.
	jest
		.spyOn(HTMLElement.prototype, "scrollWidth", "get")
		.mockImplementation(() => Math.max(contentWidth, elementWidth));
	jest
		.spyOn(HTMLElement.prototype, "clientWidth", "get")
		.mockImplementation(() => elementWidth);
});

afterEach(() => jest.restoreAllMocks());

function Harness() {
	const ref = useRef<HTMLDivElement>(null);
	const collapsed = useCollapseOnOverflow(ref);
	return (
		<div ref={ref}>
			<span data-testid="child">{collapsed ? "compact" : "full"}</span>
		</div>
	);
}

const resizeTo = (width: number) => {
	elementWidth = width;
	act(() => resizeCallbacks.forEach((callback) => callback()));
};

describe("useCollapseOnOverflow", () => {
	it("stays expanded while the content fits", () => {
		contentWidth = 500;
		elementWidth = 800;

		render(<Harness />);

		expect(screen.getByText("full")).toBeInTheDocument();
	});

	it("collapses when the content is too wide from the start", () => {
		contentWidth = 700;
		elementWidth = 400;

		render(<Harness />);

		expect(screen.getByText("compact")).toBeInTheDocument();
	});

	it("collapses when the element shrinks below the content", () => {
		contentWidth = 700;
		elementWidth = 900;
		render(<Harness />);
		expect(screen.getByText("full")).toBeInTheDocument();

		resizeTo(600);

		expect(screen.getByText("compact")).toBeInTheDocument();
	});

	it("stays collapsed until the element is as wide as the expanded content", () => {
		contentWidth = 700;
		elementWidth = 900;
		render(<Harness />);
		resizeTo(600);
		expect(screen.getByText("compact")).toBeInTheDocument();

		resizeTo(699);
		expect(screen.getByText("compact")).toBeInTheDocument();

		resizeTo(700);
		expect(screen.getByText("full")).toBeInTheDocument();
	});

	it("expands again once the element is wide enough, after shrinking in several steps", () => {
		contentWidth = 700;
		elementWidth = 1200;
		render(<Harness />);
		resizeTo(1000);
		resizeTo(800);
		resizeTo(650);
		expect(screen.getByText("compact")).toBeInTheDocument();

		resizeTo(1200);

		expect(screen.getByText("full")).toBeInTheDocument();
	});

	it("watches the element and its children, which grow when the content changes", () => {
		contentWidth = 500;
		elementWidth = 800;

		const { container, getByTestId } = render(<Harness />);

		expect(observed).toContain(container.firstElementChild);
		expect(observed).toContain(getByTestId("child"));
	});

	it("does not fail where ResizeObserver does not exist", () => {
		// @ts-expect-error simulates an environment without ResizeObserver
		delete global.ResizeObserver;
		contentWidth = 500;
		elementWidth = 800;

		expect(() => render(<Harness />)).not.toThrow();
	});
});
