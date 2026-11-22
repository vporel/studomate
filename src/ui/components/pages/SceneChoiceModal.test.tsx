/** @jest-environment jsdom */
import type { SceneDescriptor } from "@/3d-scenes/scene.descriptor";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import SceneChoiceModal from "./SceneChoiceModal";

const crossroads: SceneDescriptor = {
	id: "crossroads",
	version: 1,
	labelKey: "crossroads.label",
	descriptionKey: "crossroads.description",
	imageUrl: "/images/crossroads.png",
	points: [],
};
const parking: SceneDescriptor = {
	id: "parking",
	version: 1,
	labelKey: "parking.label",
	descriptionKey: "parking.description",
	imageUrl: "/images/parking.png",
	points: [],
};

function setup(
	props: Partial<React.ComponentProps<typeof SceneChoiceModal>> = {},
) {
	const onClose = jest.fn();
	const onChoose = jest.fn();
	renderWithI18n(
		<SceneChoiceModal
			open
			onClose={onClose}
			scenes={[crossroads, parking]}
			currentSceneId={null}
			onChoose={onChoose}
			{...props}
		/>,
	);
	return { onClose, onChoose };
}

describe("SceneChoiceModal", () => {
	it("renders nothing when closed", () => {
		setup({ open: false });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("shows the title, the 'none' card and one card per scene", () => {
		setup();
		expect(screen.getByRole("dialog")).toHaveAccessibleName(
			"Choisir une scène",
		);
		expect(screen.getByText("Aucune")).toBeInTheDocument();
		expect(screen.getByText("Carrefour de feux")).toBeInTheDocument();
		expect(screen.getByText("Parking à barrière")).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: /./ }).length,
		).toBeGreaterThanOrEqual(3);
	});

	it("gives each scene image its translated alt text and source", () => {
		setup();
		const image = screen.getByAltText("Capture de la scène Carrefour de feux");
		expect(image).toHaveAttribute("src", "/images/crossroads.png");
	});

	it("calls onChoose with the descriptor of the clicked scene", () => {
		const { onChoose } = setup();
		fireEvent.click(screen.getByText("Parking à barrière"));
		expect(onChoose).toHaveBeenCalledTimes(1);
		expect(onChoose).toHaveBeenCalledWith(parking);
	});

	it("calls onChoose with null for 'no scene'", () => {
		const { onChoose } = setup({ currentSceneId: "parking" });
		fireEvent.click(screen.getByText("Aucune"));
		expect(onChoose).toHaveBeenCalledWith(null);
	});

	it("highlights only the card of the current scene", () => {
		setup({ currentSceneId: "parking" });
		const cardOf = (label: string) =>
			screen.getByText(label).closest(".MuiCard-root") as HTMLElement;
		expect(cardOf("Parking à barrière")).toHaveStyle({ borderWidth: "2px" });
		expect(cardOf("Carrefour de feux")).toHaveStyle({ borderWidth: "1px" });
		expect(cardOf("Aucune")).toHaveStyle({ borderWidth: "1px" });
	});

	it("highlights the 'none' card when no scene is attached", () => {
		setup({ currentSceneId: null });
		const none = screen.getByText("Aucune").closest(".MuiCard-root");
		expect(none).toHaveStyle({ borderWidth: "2px" });
	});

	it("only shows 'none' when there is no scene", () => {
		setup({ scenes: [] });
		expect(screen.getByText("Aucune")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("cancels through the close button", () => {
		const { onClose, onChoose } = setup();
		fireEvent.click(screen.getByRole("button", { name: /Fermer/ }));
		expect(onClose).toHaveBeenCalled();
		expect(onChoose).not.toHaveBeenCalled();
	});

	it("cancels with Escape", () => {
		const { onClose, onChoose } = setup();
		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(onClose).toHaveBeenCalled();
		expect(onChoose).not.toHaveBeenCalled();
	});
});
