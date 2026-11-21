/** @jest-environment jsdom */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import type { PageType } from "@/ui/stores/project/project.store";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import PageTab, { TYPE_ICONS } from "./PageTab";

jest.mock("@/ui/components/projects/ProjectContext");

type Options = {
	id?: string;
	title?: string;
	type?: PageType;
	activePageId?: string;
	mode?: ProjectMode;
	editingEnabled?: boolean;
	locked?: boolean;
	isMain?: boolean;
	onParentPointerDown?: jest.Mock;
};

function setup({
	id = "p1",
	title = "Mon grafcet",
	type = "grafcet",
	activePageId = "p1",
	mode = ProjectMode.DESIGN,
	editingEnabled = true,
	locked = false,
	isMain = false,
	onParentPointerDown,
}: Options = {}) {
	const setActivePage = jest.fn();
	const closePage = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pagesManager: { setActivePage, closePage },
			activePageId,
			mode,
			editingEnabled,
			pagesData: { [id]: { id, title, type, locked } },
			project: { ladders: { [id]: { isMain: () => isMain } } },
		}),
	);
	renderWithI18n(
		<DndContext>
			<SortableContext items={[id]}>
				<div onPointerDown={onParentPointerDown}>
					<PageTab id={id} title={title} type={type} />
				</div>
			</SortableContext>
		</DndContext>,
	);
	return { setActivePage, closePage, tab: screen.getByRole("tab") };
}

describe("PageTab", () => {
	it("shows the program title as is", () => {
		const { tab } = setup({ title: "Mon grafcet" });
		expect(tab).toHaveTextContent("Mon grafcet");
		expect(tab).toHaveAttribute("data-page-id", "p1");
	});

	it("shows the translated title of a system page, ignoring the stored title", () => {
		const { tab } = setup({ type: "preferences", title: "x" });
		expect(tab).toHaveTextContent("Préférences");
		expect(tab).not.toHaveTextContent("x");
	});

	it("marks the active tab with aria-selected", () => {
		expect(setup({ activePageId: "p1" }).tab).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("does not mark an inactive tab as selected", () => {
		expect(setup({ activePageId: "other" }).tab).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("activates its page on click", () => {
		const { tab, setActivePage } = setup({ activePageId: "other" });
		fireEvent.click(tab);
		expect(setActivePage).toHaveBeenCalledWith("p1");
	});

	it.each(["Enter", " "])("activates its page on the %j key", (key) => {
		const { tab, setActivePage } = setup();
		fireEvent.keyDown(tab, { key });
		expect(setActivePage).toHaveBeenCalledWith("p1");
	});

	it("ignores other keys", () => {
		const { tab, setActivePage } = setup();
		fireEvent.keyDown(tab, { key: "a" });
		expect(setActivePage).not.toHaveBeenCalled();
	});

	describe("close button", () => {
		it("closes the page without activating it", () => {
			const { closePage, setActivePage } = setup({ activePageId: "other" });
			fireEvent.click(screen.getByRole("button", { name: "Fermer l'onglet" }));
			expect(closePage).toHaveBeenCalledWith("p1");
			expect(setActivePage).not.toHaveBeenCalled();
		});

		it("does not let the pointer-down start a drag of the tab", () => {
			const onParentPointerDown = jest.fn();
			setup({ onParentPointerDown });
			fireEvent.pointerDown(
				screen.getByRole("button", { name: "Fermer l'onglet" }),
			);
			expect(onParentPointerDown).not.toHaveBeenCalled();
		});

		it("is missing on the HMI simulation tab, which can never be closed", () => {
			setup({ type: "hmi-simulation" });
			expect(
				screen.queryByRole("button", { name: "Fermer l'onglet" }),
			).not.toBeInTheDocument();
		});

		it("is present for every other type", () => {
			setup({ type: "variables" });
			expect(
				screen.getByRole("button", { name: "Fermer l'onglet" }),
			).toBeInTheDocument();
		});
	});

	describe("read-only padlock (canEdit rules)", () => {
		const padlock = () => screen.queryByRole("img", { name: "Lecture seule" });

		it("is hidden in design mode on an unlocked editor page", () => {
			setup();
			expect(padlock()).not.toBeInTheDocument();
		});

		it("is shown on an editor page in simulation mode", () => {
			setup({ mode: ProjectMode.SIMULATION });
			expect(padlock()).toBeInTheDocument();
		});

		it("is hidden on an HMI page in simulation mode", () => {
			setup({ type: "hmi", mode: ProjectMode.SIMULATION });
			expect(padlock()).not.toBeInTheDocument();
		});

		it("is shown on a locked page even in design mode", () => {
			setup({ locked: true });
			expect(padlock()).toBeInTheDocument();
		});

		it("is shown when editing is disabled for the project", () => {
			setup({ editingEnabled: false });
			expect(padlock()).toBeInTheDocument();
		});

		it("is never shown on a non-editor page", () => {
			setup({ type: "preferences", locked: true, editingEnabled: false });
			expect(padlock()).not.toBeInTheDocument();
		});

		it("does not prevent closing a locked tab", () => {
			const { closePage } = setup({ locked: true });
			fireEvent.click(screen.getByRole("button", { name: "Fermer l'onglet" }));
			expect(closePage).toHaveBeenCalledWith("p1");
		});
	});

	describe("icon", () => {
		const iconOf = (tab: HTMLElement) =>
			tab.querySelector(".page__tab__type-icon");

		it("renders a type icon for every non-ladder page type", () => {
			for (const type of Object.keys(
				TYPE_ICONS,
			) as (keyof typeof TYPE_ICONS)[]) {
				const { unmount } = (() => {
					const { tab } = setup({ type });
					expect(iconOf(tab)).toBeInTheDocument();
					return { unmount: () => document.body.replaceChildren() };
				})();
				unmount();
			}
		});

		it("uses a different icon for the main ladder", () => {
			const mainMarkup = iconOf(
				setup({ type: "ladder", isMain: true }).tab,
			)?.outerHTML;
			document.body.replaceChildren();
			const otherMarkup = iconOf(
				setup({ type: "ladder", isMain: false }).tab,
			)?.outerHTML;
			expect(mainMarkup).toBeDefined();
			expect(otherMarkup).toBeDefined();
			expect(otherMarkup).not.toBe(mainMarkup);
		});
	});
});
