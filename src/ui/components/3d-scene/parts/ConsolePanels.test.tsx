/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ConsoleGroup from "./ConsoleGroup";
import ConsolePanels from "./ConsolePanels";
import ScenePanelsProvider from "./ScenePanelsContext";
import { PANEL_EDGE_MARGIN } from "./scene-panels-state";

function setup() {
	return renderWithI18n(
		<ScenePanelsProvider foldPanels={false}>
			<div style={{ position: "relative" }}>
				<ConsolePanels>
					<ConsoleGroup title="Feeder">
						<span>place</span>
					</ConsoleGroup>
					<ConsoleGroup title="Console">
						<span>start</span>
					</ConsoleGroup>
				</ConsolePanels>
			</div>
		</ScenePanelsProvider>,
	);
}

describe("ConsolePanels", () => {
	afterEach(() => jest.restoreAllMocks());

	it("holds every panel in a single box titled Commandes", () => {
		setup();
		const box = screen.getByRole("dialog", { name: "Commandes" });
		expect(box).toContainElement(screen.getByText("place"));
		expect(box).toContainElement(screen.getByText("start"));
		expect(screen.getAllByRole("dialog")).toHaveLength(1);
	});

	it("is positioned from the top right corner of the scene, so that it follows that corner when the scene is resized", () => {
		setup();
		const box = screen.getByRole("dialog", { name: "Commandes" });
		expect(box).toHaveStyle({
			right: `${PANEL_EDGE_MARGIN}px`,
			top: `${PANEL_EDGE_MARGIN}px`,
		});
		expect(box.style.left).toBe("");
	});

	it("is as wide as its content unless it is given a width", () => {
		setup();
		expect(screen.getByRole("dialog", { name: "Commandes" })).toHaveStyle({
			width: "auto",
		});
	});

	it("takes the width it is given", () => {
		renderWithI18n(
			<ScenePanelsProvider foldPanels={false}>
				<div style={{ position: "relative" }}>
					<ConsolePanels width={250}>
						<ConsoleGroup title="Feeder">
							<span>place</span>
						</ConsoleGroup>
					</ConsolePanels>
				</div>
			</ScenePanelsProvider>,
		);
		expect(screen.getByRole("dialog", { name: "Commandes" })).toHaveStyle({
			width: "250px",
		});
	});

	it("has no close button, since the controls are not closed", () => {
		setup();
		expect(screen.queryByRole("button", { name: /Fermer/ })).toBeNull();
	});

	it("limits the height of the panels to what the scene leaves under the header", () => {
		jest
			.spyOn(HTMLElement.prototype, "clientHeight", "get")
			.mockImplementation(() => 320);
		jest
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockImplementation(function (this: HTMLElement) {
				return this.getAttribute("role") === "dialog" ? 200 : 160;
			});
		jest
			.spyOn(HTMLElement.prototype, "offsetParent", "get")
			.mockImplementation(function (this: HTMLElement) {
				return this.parentElement;
			});
		setup();

		const content = screen.getByRole("group", { name: "Feeder" }).parentElement;
		expect(content).toHaveStyle({
			maxHeight: `${320 - 2 * PANEL_EDGE_MARGIN - 40}px`,
		});
	});

	it("does not limit the height when it cannot measure its scene", () => {
		setup();
		const content = screen.getByRole("group", { name: "Feeder" }).parentElement;
		expect(content?.style.maxHeight).toBe("");
	});
});
