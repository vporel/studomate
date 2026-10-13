/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Scene3dTool from "./Scene3dTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("Scene3dTool", () => {
	const open = jest.fn();

	function setup(scene3d: unknown) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { scene3d },
				scene3dLinkManager: { open },
			}),
		);
		return renderWithI18n(<Scene3dTool />);
	}

	afterEach(() => jest.clearAllMocks());

	it("is hidden when the project has no scene", () => {
		setup(null);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("opens the scene tab when clicked", () => {
		setup({ sceneId: "carton-sorting", bindings: {} });
		fireEvent.click(screen.getByRole("button", { name: /scène 3d/i }));
		expect(open).toHaveBeenCalledTimes(1);
	});

	it("shows its label as a tooltip on hover", async () => {
		setup({ sceneId: "carton-sorting", bindings: {} });
		fireEvent.mouseOver(screen.getByRole("button", { name: /scène 3d/i }));
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Scène 3D");
	});
});
