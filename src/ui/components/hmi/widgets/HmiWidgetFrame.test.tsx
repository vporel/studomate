/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import HmiWidgetFrame from "./HmiWidgetFrame";

const renderFrame = (props = {}) =>
	render(
		<HmiWidgetFrame label="Pompe" {...props}>
			<span>contenu</span>
		</HmiWidgetFrame>,
	);

const root = () => screen.getByText("contenu").parentElement as HTMLElement;

describe("HmiWidgetFrame", () => {
	it("affiche le contenu et le libellé", () => {
		renderFrame();

		expect(screen.getByText("contenu")).toBeInTheDocument();
		expect(screen.getByText("Pompe")).toBeInTheDocument();
	});

	it("masque le libellé avec hideLabel", () => {
		renderFrame({ hideLabel: true });

		expect(screen.queryByText("Pompe")).not.toBeInTheDocument();
	});

	it("relaie le clic", () => {
		const onClick = jest.fn();
		renderFrame({ onClick });

		fireEvent.click(root());

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("curseur pointer avec onClick, default sans", () => {
		const { unmount } = renderFrame({ onClick: () => {} });
		expect(root()).toHaveStyle({ cursor: "pointer" });
		unmount();

		renderFrame();
		expect(root()).toHaveStyle({ cursor: "default" });
	});

	it("le curseur explicite l'emporte", () => {
		renderFrame({ cursor: "pointer" });

		expect(root()).toHaveStyle({ cursor: "pointer" });
	});
});
