/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import { fireEvent, screen } from "@testing-library/react";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import Project from "@/schemas/project/project.schema";
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
	new Variable({
		id: "v1",
		mnemonic: "arret",
		zone: "logic-input",
		type: "BOOL",
		dialect: Dialect.FR,
	}).update(
		{
			behavior: { kind: "push-button-nc", params: null },
		},
		Dialect.FR,
	),
	new Variable({
		id: "v2",
		mnemonic: "libre",
		zone: "logic-input",
		type: "BOOL",
		dialect: Dialect.FR,
	}),
];

function setup(widget: HmiWidget, readOnly = false) {
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
			project: Object.assign(new Project("p1", "Projet", ""), { variables }),
			mode: ProjectMode.DESIGN,
			simulationVariablesStates: {},
		}),
	);
	renderWithI18n(
		<HmiWidgetPropertiesPanel
			widget={widget}
			onGeometryPreview={jest.fn()}
			readOnly={readOnly}
		/>,
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

describe("HmiWidgetPropertiesPanel — lecture seule", () => {
	it("laisse les champs modifiables hors lecture seule", () => {
		setup(pushButton);

		expect(
			screen.getByLabelText("Variable liée").closest("[inert]"),
		).toBeNull();
	});

	it("rend les champs inertes en lecture seule, tout en montrant la variable liée", () => {
		setup(
			{
				...pushButton,
				data: { variable: "libre", label: "BP", behavior: "toggle" },
			} as unknown as HmiWidget,
			true,
		);

		const variable = screen.getByLabelText("Variable liée");
		expect(variable).toHaveValue("libre");
		expect(variable.closest("[inert]")).not.toBeNull();
		expect(screen.getByLabelText("Nom").closest("[inert]")).not.toBeNull();
	});

	it("garde actif le bouton qui ouvre les animations, pour les lire", () => {
		setup(pushButton, true);

		expect(
			screen.getByRole("button", { name: "Animations" }).closest("[inert]"),
		).toBeNull();
	});
});
