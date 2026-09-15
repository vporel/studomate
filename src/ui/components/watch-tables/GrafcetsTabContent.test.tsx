/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetsTabContent from "./GrafcetsTabContent";

jest.mock("@/ui/components/projects/ProjectContext");

describe("GrafcetsTabContent", () => {
	function setup({
		grafcets = {},
		simulationVariablesStates = {},
	}: {
		grafcets?: Record<string, ReturnType<GrafcetBuilder["build"]>>;
		simulationVariablesStates?: Record<string, { value: boolean }>;
	} = {}) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				project: {
					grafcets,
					getGrafcet: (id: string) => grafcets[id],
				},
				simulationVariablesStates,
			}),
		);
		return renderWithI18n(<GrafcetsTabContent />);
	}

	it("shows a message when the project has no grafcet", () => {
		setup();
		expect(screen.getByText("Aucun grafcet dans le projet")).toBeInTheDocument();
	});

	it("shows a dash when no step is active", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.name("Grafcet_1")
			.addStep(new StepBuilder().id("s1").number(1).position(0, 0).build())
			.build();
		setup({ grafcets: { g1: grafcet } });
		expect(screen.getByText("Grafcet_1")).toBeInTheDocument();
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("shows the active step number", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.name("Grafcet_1")
			.addStep(new StepBuilder().id("s1").number(1).position(0, 0).build())
			.addStep(new StepBuilder().id("s2").number(2).position(0, 0).build())
			.build();
		setup({
			grafcets: { g1: grafcet },
			simulationVariablesStates: {
				[getStepVariableId("g1", 2)]: { value: true },
			},
		});
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("shows several active step numbers separated by commas", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.name("Grafcet_1")
			.addStep(new StepBuilder().id("s1").number(1).position(0, 0).build())
			.addStep(new StepBuilder().id("s2").number(2).position(0, 0).build())
			.build();
		setup({
			grafcets: { g1: grafcet },
			simulationVariablesStates: {
				[getStepVariableId("g1", 1)]: { value: true },
				[getStepVariableId("g1", 2)]: { value: true },
			},
		});
		expect(screen.getByText("1, 2")).toBeInTheDocument();
	});

	it("shows one row per grafcet", () => {
		const grafcet1 = new GrafcetBuilder().id("g1").name("Grafcet_1").build();
		const grafcet2 = new GrafcetBuilder().id("g2").name("Grafcet_2").build();
		setup({ grafcets: { g1: grafcet1, g2: grafcet2 } });
		expect(screen.getByText("Grafcet_1")).toBeInTheDocument();
		expect(screen.getByText("Grafcet_2")).toBeInTheDocument();
	});
});
