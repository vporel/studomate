/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import StepReferralTargetNode, {
	StepReferralTargetNodeType,
} from "./StepReferralTargetNode";

jest.mock("../context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

function setup({
	sourceStepNumber = 3 as number | "",
	updateNodeData = jest.fn(),
} = {}) {
	const referral = new StepReferralTargetBuilder()
		.id("ref-1")
		.sourceStepNumber(sourceStepNumber)
		.position(0, 0)
		.build();
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStepReferralTarget(referral)
		.build();

	(useGrafcetContext as jest.Mock).mockReturnValue({
		store: fakeStoreApi({ grafcet }),
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcet,
			workflowManager: { updateNodeData },
			highlightedNodesIds: [],
		}),
	);

	const props = {
		id: "ref-1",
		data: { sourceStepNumber },
		selected: false,
		type: "step-referral-target",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as StepReferralTargetNodeType & { id: string };

	render(<StepReferralTargetNode {...(props as any)} />);
	return { updateNodeData };
}

function numberInput(): HTMLInputElement {
	return document.querySelector(
		".step_referral_target_node__input",
	) as HTMLInputElement;
}

describe("StepReferralTargetNode", () => {
	it("affiche le numéro de l'étape source", () => {
		setup({ sourceStepNumber: 5 });
		expect(numberInput().value).toBe("5");
	});

	it("édite le numéro source au double-clic puis dispatche la commande de mise à jour au blur", () => {
		const { updateNodeData } = setup({ sourceStepNumber: 1 });
		fireEvent.doubleClick(
			document.querySelector(".grafcet-step-referral-target-node")!,
		);
		const input = numberInput();

		fireEvent.change(input, { target: { value: "9" } });
		fireEvent.blur(input);

		expect(updateNodeData).toHaveBeenCalledWith("ref-1", {
			sourceStepNumber: 9,
		});
	});
});
