/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import JunctionTool from "./JunctionTool";

jest.mock("@/ui/components/projects/ProjectContext");

type Type = Parameters<typeof JunctionTool>[0]["type"];

/** Renders the tool and returns its pictogram as a top-to-bottom list of pieces. */
const pictogram = (type: Type): string[] => {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode: ProjectMode.DESIGN }),
	);
	const { container } = render(
		<GrafcetToolbarDnDProvider>
			<JunctionTool type={type} />
		</GrafcetToolbarDnDProvider>,
	);
	const root = Array.from(container.querySelectorAll("div")).find(
		(el) => getComputedStyle(el).width === "40px",
	)!;
	return Array.from(root.children).map((child) => {
		const style = getComputedStyle(child);
		if (style.position === "relative") return "legs";
		return style.width === "1px" ? `stem-${style.height}` : "bar";
	});
};

describe("JunctionTool", () => {
	it.each<[Type, string[]]>([
		["junction-and-start", ["stem-4px", "bar", "bar", "legs"]],
		["junction-and-end", ["legs", "bar", "bar", "stem-4px"]],
		["junction-or-start", ["stem-5px", "bar", "legs"]],
		["junction-or-end", ["legs", "bar", "stem-5px"]],
	])("dessine le pictogramme de %s", (type, expected) => {
		expect(pictogram(type)).toEqual(expected);
	});

	it("porte la classe de l'élément et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);
		render(
			<GrafcetToolbarDnDProvider>
				<JunctionTool type="junction-or-start" disabled />
			</GrafcetToolbarDnDProvider>,
		);
		expect(
			document.querySelector(".grafcet-toolbar__junction-or-start"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});
});
