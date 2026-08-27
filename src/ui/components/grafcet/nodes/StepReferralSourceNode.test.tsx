/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import StepReferralSourceNode, {
	StepReferralSourceNodeType,
} from "./StepReferralSourceNode";

jest.mock("../context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

function setup({
	targetStepNumber = 3 as number | "",
	updateNodeData = jest.fn(),
} = {}) {
	const referral = new StepReferralSourceBuilder()
		.id("ref-1")
		.targetStepNumber(targetStepNumber)
		.position(0, 0)
		.build();
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStepReferralSource(referral)
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
		data: { targetStepNumber },
		selected: false,
		type: "step-referral-source",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as StepReferralSourceNodeType & { id: string };

	render(<StepReferralSourceNode {...(props as any)} />);
	return { updateNodeData };
}

function numberInput(): HTMLInputElement {
	return document.querySelector(
		".step_referral_source_node__input",
	) as HTMLInputElement;
}

describe("StepReferralSourceNode", () => {
	it("affiche le numéro de l'étape cible", () => {
		setup({ targetStepNumber: 5 });
		expect(numberInput().value).toBe("5");
	});

	it("édite le numéro cible au double-clic puis dispatche la commande de mise à jour au blur", () => {
		const { updateNodeData } = setup({ targetStepNumber: 1 });
		fireEvent.doubleClick(
			document.querySelector(".grafcet-step-referral-source-node")!,
		);
		const input = numberInput();

		fireEvent.change(input, { target: { value: "9" } });
		fireEvent.blur(input);

		expect(updateNodeData).toHaveBeenCalledWith("ref-1", {
			targetStepNumber: 9,
		});
	});
});
