/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import BottomPanelTabs from "./BottomPanelTabs";

const tabs = [
	{
		id: "a",
		label: "Titre a",
		dataTour: "tour-a",
		content: <span>contenu a</span>,
	},
	{ id: "b", label: "Titre b", color: "red", content: <span>contenu b</span> },
];

const setup = (activeId: string | null = "a") => {
	const onSelect = jest.fn();
	const onClose = jest.fn();
	const view = render(
		<BottomPanelTabs
			tabs={tabs}
			activeId={activeId}
			onSelect={onSelect}
			onClose={onClose}
			closeLabel="Fermer"
			closeAriaLabel="close-panel"
		/>,
	);
	return { onSelect, onClose, ...view };
};

const tab = (name: string) => screen.getByRole("tab", { name });

describe("BottomPanelTabs", () => {
	it("renders nothing when no tab is active", () => {
		const { container } = setup(null);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows every tab and only the content of the active one", () => {
		setup("b");
		expect(screen.getAllByRole("tab")).toHaveLength(2);
		expect(screen.getByText("contenu b")).toBeInTheDocument();
		expect(screen.queryByText("contenu a")).not.toBeInTheDocument();
		expect(tab("Titre b")).toHaveAttribute("aria-selected", "true");
		expect(tab("Titre a")).toHaveAttribute("aria-selected", "false");
	});

	it("gives a tab its colour and its tour anchor", () => {
		setup("a");
		expect(tab("Titre b")).toHaveStyle({ color: "rgb(255, 0, 0)" });
		expect(tab("Titre a")).toHaveAttribute("data-tour", "tour-a");
	});

	it("selects a tab on click", () => {
		const { onSelect } = setup("a");
		fireEvent.click(tab("Titre b"));
		expect(onSelect).toHaveBeenCalledWith("b");
	});

	it("has a single close button for the whole panel", () => {
		const { onClose, onSelect } = setup("a");
		expect(screen.getAllByLabelText("close-panel")).toHaveLength(1);
		fireEvent.click(screen.getByLabelText("close-panel"));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onSelect).not.toHaveBeenCalled();
	});
});
