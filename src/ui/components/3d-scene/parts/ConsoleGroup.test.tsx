/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ConsoleGroup from "./ConsoleGroup";
import ConsolePanels from "./ConsolePanels";
import ScenePanelsProvider from "./ScenePanelsContext";

function setup(foldPanels: boolean) {
	return renderWithI18n(
		<ScenePanelsProvider foldPanels={foldPanels}>
			<ConsolePanels>
				<ConsoleGroup title="Feeder">
					<button type="button">place</button>
				</ConsoleGroup>
				<ConsoleGroup title="Console">
					<button type="button">start</button>
				</ConsoleGroup>
				<ConsoleGroup title="Lamps">
					<button type="button">lamp</button>
				</ConsoleGroup>
			</ConsolePanels>
		</ScenePanelsProvider>,
	);
}

const toggle = (title: string) =>
	screen.getByRole("button", { name: new RegExp(`panneau: ${title}$`) });

describe("ConsoleGroup", () => {
	it("renders one group per panel, named by its title", () => {
		setup(false);
		expect(
			screen
				.getAllByRole("group")
				.map((group) => group.getAttribute("aria-label")),
		).toEqual(["Feeder", "Console", "Lamps"]);
	});

	it("opens every panel when the panels are not folded", () => {
		setup(false);
		for (const content of ["place", "start", "lamp"]) {
			expect(screen.getByText(content)).toBeVisible();
		}
		expect(toggle("Console")).toHaveAttribute("aria-expanded", "true");
	});

	it("opens only the first panel when the panels are folded", () => {
		setup(true);
		expect(screen.getByText("place")).toBeVisible();
		expect(screen.getByText("start")).not.toBeVisible();
		expect(screen.getByText("lamp")).not.toBeVisible();
		expect(toggle("Console")).toHaveAttribute("aria-expanded", "false");
	});

	it("keeps the content of a folded panel in place, so that the box keeps its width", () => {
		setup(true);
		expect(screen.getByText("start")).toBeInTheDocument();
	});

	it("unfolds a folded panel and folds it back", () => {
		setup(true);

		fireEvent.click(toggle("Console"));
		expect(screen.getByText("start")).toBeVisible();
		expect(screen.getByText("place")).toBeVisible();

		fireEvent.click(toggle("Console"));
		expect(screen.getByText("start")).not.toBeVisible();
	});

	it("folds a panel without touching the others", () => {
		setup(false);

		fireEvent.click(toggle("Feeder"));

		expect(screen.getByText("place")).not.toBeVisible();
		expect(screen.getByText("start")).toBeVisible();
		expect(screen.getByText("lamp")).toBeVisible();
	});

	it("lets several panels be open at once", () => {
		setup(true);

		fireEvent.click(toggle("Console"));
		fireEvent.click(toggle("Lamps"));

		expect(screen.getByText("place")).toBeVisible();
		expect(screen.getByText("start")).toBeVisible();
		expect(screen.getByText("lamp")).toBeVisible();
	});

	it("announces the action of the button of a panel by its state", () => {
		setup(false);
		expect(toggle("Feeder")).toHaveAccessibleName("Replier le panneau: Feeder");

		fireEvent.click(toggle("Feeder"));

		expect(toggle("Feeder")).toHaveAccessibleName("Déplier le panneau: Feeder");
	});

	it("keeps the content of an open panel reachable by its own controls", () => {
		const onClick = jest.fn();
		renderWithI18n(
			<ScenePanelsProvider foldPanels>
				<ConsolePanels>
					<ConsoleGroup title="Only">
						<button type="button" onClick={onClick}>
							go
						</button>
					</ConsoleGroup>
				</ConsolePanels>
			</ScenePanelsProvider>,
		);

		fireEvent.click(screen.getByText("go"));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("refuses to render outside a provider", () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			renderWithI18n(
				<ConsoleGroup title="Lost">
					<span>x</span>
				</ConsoleGroup>,
			),
		).toThrow("ScenePanelsProvider");
		jest.restoreAllMocks();
	});
});
