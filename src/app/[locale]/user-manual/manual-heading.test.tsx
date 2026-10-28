/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import {
	ManualH2,
	ManualH3,
	ManualH4,
	ManualHeadingOffsetProvider,
} from "./manual-heading";

const renderHeadings = () =>
	render(
		<>
			<ManualH2>deux</ManualH2>
			<ManualH3>trois</ManualH3>
			<ManualH4>quatre</ManualH4>
		</>,
	);

describe("manual headings", () => {
	it("renders h2, h3 and h4 without a provider", () => {
		renderHeadings();

		expect(screen.getByRole("heading", { level: 2, name: "deux" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 3, name: "trois" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 4, name: "quatre" })).toBeTruthy();
	});

	it("shifts every level up by the provided offset", () => {
		render(
			<ManualHeadingOffsetProvider offset={1}>
				<ManualH2>deux</ManualH2>
				<ManualH3>trois</ManualH3>
				<ManualH4>quatre</ManualH4>
			</ManualHeadingOffsetProvider>,
		);

		expect(screen.getByRole("heading", { level: 1, name: "deux" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 2, name: "trois" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 3, name: "quatre" })).toBeTruthy();
	});
});
