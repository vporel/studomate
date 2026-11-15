/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import StepReferralTargetTool from "./StepReferralTargetTool";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/grafcet/context/GrafcetContext");

describe("StepReferralTargetTool", () => {
	it("porte la classe de l'element 'step-referral-target' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<StepReferralTargetTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(
			document.querySelector(".grafcet-toolbar__step-referral-target"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});
});
