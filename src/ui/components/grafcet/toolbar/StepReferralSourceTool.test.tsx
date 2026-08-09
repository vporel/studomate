/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import StepReferralSourceTool from "./StepReferralSourceTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("StepReferralSourceTool", () => {
	it("porte la classe de l'element 'step-referral-source' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<StepReferralSourceTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(document.querySelector(".grafcet-toolbar__step-referral-source")).toBeInTheDocument();
		expect(document.querySelector(".grafcet-toolbar__tool--disabled")).toBeInTheDocument();
	});
});
