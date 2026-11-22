/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import Pane from "./Pane";
import SplitPane from "./SplitPane";

const dividerDisplays = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLElement>("div"))
		.filter((element) =>
			["col-resize", "row-resize"].includes(getComputedStyle(element).cursor),
		)
		.map((element) => getComputedStyle(element).display);

describe("SplitPane dividers", () => {
	it("shows the divider between two visible panes", () => {
		const { container } = render(
			<SplitPane split="horizontal">
				<Pane>a</Pane>
				<Pane>b</Pane>
			</SplitPane>,
		);
		expect(dividerDisplays(container)).toEqual(["block"]);
	});

	it("hides the divider when the pane after it is hidden", () => {
		const { container } = render(
			<SplitPane split="horizontal">
				<Pane>a</Pane>
				<Pane visible={false}>b</Pane>
			</SplitPane>,
		);
		expect(dividerDisplays(container)).toEqual(["none"]);
	});

	it("hides the divider when the pane before it is hidden", () => {
		const { container } = render(
			<SplitPane split="vertical">
				<Pane visible={false}>a</Pane>
				<Pane>b</Pane>
			</SplitPane>,
		);
		expect(dividerDisplays(container)).toEqual(["none"]);
	});
});
