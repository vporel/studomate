/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import AppMenu from "./AppMenu";
import type { AppMenuType } from "./app-menu-bar";

const onFlat = jest.fn();
const onFloating = jest.fn();
const onPage = jest.fn();
const onDeactivate = jest.fn();

const menu: AppMenuType = {
	id: "view",
	label: "Affichage",
	items: [
		[{ label: "Explorateur", onClick: onFlat }],
		[
			{
				label: "Scène 3D",
				subItems: [
					{ label: "Cadre flottant", onClick: onFloating },
					{ label: "Page", checked: true, onClick: onPage },
				],
			},
		],
	],
};

function setup() {
	return render(
		<AppMenu
			menu={menu}
			focused
			activeMenuId="view"
			onActivate={jest.fn()}
			onOpen={jest.fn()}
			onDeactivate={onDeactivate}
			onNavigate={jest.fn()}
			registerTitleRef={jest.fn()}
		/>,
	);
}

const parent = () => screen.getByRole("menuitem", { name: "Scène 3D" });

describe("AppMenu, submenus", () => {
	afterEach(() => jest.clearAllMocks());

	it("lists the entry with a submenu without showing its items", () => {
		setup();
		expect(parent()).toHaveAttribute("aria-haspopup", "menu");
		expect(parent()).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Cadre flottant")).not.toBeInTheDocument();
	});

	it("opens the submenu when the entry is clicked, and keeps the menu open", () => {
		setup();
		fireEvent.click(parent());

		expect(screen.getByText("Cadre flottant")).toBeInTheDocument();
		expect(screen.getByText("Page")).toBeInTheDocument();
		expect(parent()).toHaveAttribute("aria-expanded", "true");
		expect(onDeactivate).not.toHaveBeenCalled();
	});

	it("opens the submenu when the entry is hovered", () => {
		setup();
		fireEvent.mouseEnter(parent());
		expect(screen.getByText("Cadre flottant")).toBeInTheDocument();
	});

	it("checks the items of the submenu that are checked", () => {
		setup();
		fireEvent.click(parent());
		const page = screen.getByRole("menuitem", { name: "Page" });
		const floating = screen.getByRole("menuitem", { name: "Cadre flottant" });
		expect(within(page).getByTestId("CheckIcon")).toBeInTheDocument();
		expect(within(floating).queryByTestId("CheckIcon")).toBeNull();
	});

	it("runs the item that is clicked and closes the menu", () => {
		setup();
		fireEvent.click(parent());
		fireEvent.click(screen.getByRole("menuitem", { name: "Cadre flottant" }));

		expect(onFloating).toHaveBeenCalledTimes(1);
		expect(onPage).not.toHaveBeenCalled();
		expect(onDeactivate).toHaveBeenCalledTimes(1);
	});

	it("does not close the menu when the pointer goes down on the submenu", () => {
		setup();
		fireEvent.click(parent());
		fireEvent.mouseDown(screen.getByRole("menuitem", { name: "Page" }));
		expect(onDeactivate).not.toHaveBeenCalled();
	});

	it("closes the menu when the pointer goes down outside of it", () => {
		setup();
		fireEvent.click(parent());
		fireEvent.mouseDown(document.body);
		expect(onDeactivate).toHaveBeenCalledTimes(1);
	});

	it("closes the submenu when another entry is hovered", () => {
		setup();
		fireEvent.click(parent());
		fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Explorateur" }));
		expect(parent()).toHaveAttribute("aria-expanded", "false");
	});

	it("opens the submenu with the right arrow and closes it with the left one", () => {
		setup();
		parent().focus();
		fireEvent.keyDown(parent(), { key: "ArrowRight" });
		expect(parent()).toHaveAttribute("aria-expanded", "true");

		fireEvent.keyDown(screen.getByRole("menuitem", { name: "Page" }), {
			key: "ArrowLeft",
		});
		expect(parent()).toHaveAttribute("aria-expanded", "false");
	});

	it("runs a plain entry and closes the menu, as before", () => {
		setup();
		fireEvent.click(screen.getByRole("menuitem", { name: "Explorateur" }));
		expect(onFlat).toHaveBeenCalledTimes(1);
		expect(onDeactivate).toHaveBeenCalledTimes(1);
	});

	it("goes to the next menu with the right arrow on a plain entry, to the previous with the left one", () => {
		const onNavigate = jest.fn();
		render(
			<AppMenu
				menu={menu}
				focused
				activeMenuId="view"
				onActivate={jest.fn()}
				onOpen={jest.fn()}
				onDeactivate={onDeactivate}
				onNavigate={onNavigate}
				registerTitleRef={jest.fn()}
			/>,
		);
		const entry = screen.getByRole("menuitem", { name: "Explorateur" });

		fireEvent.keyDown(entry, { key: "ArrowRight" });
		fireEvent.keyDown(entry, { key: "ArrowLeft" });

		expect(onNavigate).toHaveBeenNthCalledWith(1, "view", 1);
		expect(onNavigate).toHaveBeenNthCalledWith(2, "view", -1);
	});

	it("does not go to the next menu with the right arrow on an entry with a submenu", () => {
		const onNavigate = jest.fn();
		render(
			<AppMenu
				menu={menu}
				focused
				activeMenuId="view"
				onActivate={jest.fn()}
				onOpen={jest.fn()}
				onDeactivate={onDeactivate}
				onNavigate={onNavigate}
				registerTitleRef={jest.fn()}
			/>,
		);
		fireEvent.keyDown(parent(), { key: "ArrowRight" });
		expect(onNavigate).not.toHaveBeenCalled();
	});
});
