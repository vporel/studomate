/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import Variable from "@/schemas/variable/variable.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HmiWidgetPropertiesPanel from "./HmiWidgetPropertiesPanel";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/components/projects/ProjectContext");

const variables = [
	new Variable("v1", "arret", "logic-input", "BOOL").update({
		behavior: { kind: "push-button-nc", params: null },
	}),
	new Variable("v2", "libre", "logic-input", "BOOL"),
];

function setup(widget: HmiWidget) {
	const updateWidget = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({
			updateWidget,
			openAnimationsPane: jest.fn(),
			openEventsPane: jest.fn(),
			hmiPage: { widgets: { [widget.id]: widget } },
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { variables, getAllTimerBlockElements: () => [], getAllCounterBlockElements: () => [] },
			mode: ProjectMode.DESIGN,
			simulationVariablesStates: {},
		}),
	);
	renderWithI18n(
		<HmiWidgetPropertiesPanel widget={widget} onGeometryPreview={jest.fn()} />,
	);
	return { updateWidget };
}

function bindVariable(mnemonic: string) {
	const input = screen.getByLabelText("Variable liée");
	fireEvent.change(input, { target: { value: mnemonic } });
	fireEvent.blur(input);
}

const pushButton = {
	id: "w1",
	name: "BP1",
	type: "push-button",
	position: { x: 0, y: 0 },
	size: { width: 90, height: 40 },
	stackOrder: 0,
	data: { variable: "", label: "BP", behavior: "toggle" },
} as unknown as HmiWidget;

describe("HmiWidgetPropertiesPanel — liaison à une entrée à comportement", () => {
	it("aligne le mode du bouton poussoir sur le comportement de l'entrée liée", () => {
		const { updateWidget } = setup(pushButton);

		bindVariable("arret");

		expect(updateWidget).toHaveBeenCalledWith("w1", {
			data: { variable: "arret", label: "BP", behavior: "momentary-nc" },
		});
	});

	it("garde le mode du widget pour une entrée sans comportement", () => {
		const { updateWidget } = setup(pushButton);

		bindVariable("libre");

		expect(updateWidget).toHaveBeenCalledWith("w1", {
			data: { variable: "libre", label: "BP", behavior: "toggle" },
		});
	});
});
