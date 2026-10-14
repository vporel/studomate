import { Dialect } from "@/expression-language/dialect.enum";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import type Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { createCartonSortingProject } from "@/templates/carton-sorting.template";
import ProjectAnalyser from "./project.analyser";
import analyseScene3d from "./scene3d.analyser";

const codes = (project: Project) => analyseScene3d(project).map((i) => i.code);
const idOf = (project: Project, mnemonic: string) =>
	project.variables.find((v) => v.mnemonic === mnemonic)!.id;

describe("analyseScene3d", () => {
	let project: Project;

	beforeEach(() => {
		project = createCartonSortingProject();
	});

	it("checks nothing without a scene", () => {
		project.scene3d = null;
		expect(analyseScene3d(project)).toEqual([]);
		project.scene3d = undefined;
		expect(analyseScene3d(project)).toEqual([]);
	});

	it("accepts the scene wired by the template", () => {
		expect(analyseScene3d(project)).toEqual([]);
	});

	it("reports an unknown scene as an error and stops there", () => {
		project.scene3d = { sceneId: "nope", bindings: {} };
		const issues = analyseScene3d(project);
		expect(issues.map((i) => i.code)).toEqual(["SCENE3D_UNKNOWN"]);
		expect(issues[0].severity).toBe("error");
		expect(issues[0].params).toEqual({ sceneId: "nope" });
	});

	it("warns about a point that is not wired", () => {
		delete project.scene3d!.bindings.t1;
		const issues = analyseScene3d(project);
		expect(issues.map((i) => i.code)).toEqual(["SCENE3D_POINT_UNBOUND"]);
		expect(issues[0].severity).toBe("warning");
		expect(issues[0].params).toEqual({ point: "Cmd_T1" });
	});

	it("reports a binding to a deleted variable", () => {
		project.scene3d!.bindings.t1 = "gone";
		const issues = analyseScene3d(project);
		expect(issues.map((i) => i.code)).toEqual([
			"SCENE3D_BINDING_VARIABLE_MISSING",
		]);
		expect(issues[0].severity).toBe("error");
	});

	it("reports a sensor bound to something else than an input", () => {
		project.scene3d!.bindings.cartonAtStation = idOf(project, "Cmd_T1");
		expect(codes(project)).toEqual(["SCENE3D_SENSOR_NOT_INPUT"]);
	});

	it("reports an actuator bound to something else than an output", () => {
		project.scene3d!.bindings.t1 = idOf(project, "cpt_psce_c");
		expect(codes(project)).toEqual(["SCENE3D_ACTUATOR_NOT_OUTPUT"]);
	});

	it("reports a variable of an incompatible type", () => {
		const integer = new VariableBuilder()
			.id("int-input")
			.mnemonic("level")
			.zone("analog-input")
			.type("INT")
			.build();
		project.variables.push(integer);
		project.scene3d!.bindings.cartonAtStation = integer.id;
		const issues = analyseScene3d(project);
		expect(issues.map((i) => i.code)).toEqual(["SCENE3D_TYPE_MISMATCH"]);
		expect(issues[0].params).toMatchObject({
			expectedType: "boolean",
			variableType: "INT",
		});
	});

	it("reports one input driven by two sensors", () => {
		project.scene3d!.bindings.cartonHigh = idOf(project, "cpt_psce_c");
		const issues = analyseScene3d(project);
		expect(issues.map((i) => i.code)).toEqual(["SCENE3D_SENSOR_DUPLICATE"]);
		expect(issues[0].params).toMatchObject({ variableName: "cpt_psce_c" });
	});

	it("accepts one output read by two actuators", () => {
		project.scene3d!.bindings.p1In = idOf(project, "Cmd_P1_out");
		expect(analyseScene3d(project)).toEqual([]);
	});

	describe("hardware target", () => {
		it("reports a sensor input that also has a pin address", () => {
			project.hardwareTarget = { modelId: "arduino-uno-r3" };
			const sensor = project.variables.find(
				(v) => v.mnemonic === "cpt_psce_c",
			)!;
			project.variables = project.variables.map((v) =>
				v.id === sensor.id ? v.update({ address: "%PD2" }, Dialect.FR) : v,
			);
			expect(codes(project)).toEqual(["SCENE3D_SENSOR_ALSO_ON_PIN"]);
		});

		it("ignores an address when the project has no hardware target", () => {
			const sensor = project.variables.find(
				(v) => v.mnemonic === "cpt_psce_c",
			)!;
			project.variables = project.variables.map((v) =>
				v.id === sensor.id ? v.update({ address: "%PD2" }, Dialect.FR) : v,
			);
			expect(analyseScene3d(project)).toEqual([]);
		});
	});

	describe("HMI widgets", () => {
		function addWidget(type: "push-button" | "indicator", variable: string) {
			const page = new HmiPage("page", "Page", true);
			page.addWidget(
				HmiWidget.create(
					type,
					0,
					0,
					{ width: 10, height: 10 },
					{ variable, label: "x" },
					0,
					"w",
				),
			);
			project.hmiPages = { page };
		}

		it("warns about a widget that writes a sensor input", () => {
			addWidget("push-button", "cpt_psce_c");
			const issues = analyseScene3d(project);
			expect(issues.map((i) => i.code)).toEqual([
				"SCENE3D_SENSOR_WRITTEN_BY_HMI",
			]);
			expect(issues[0].severity).toBe("warning");
		});

		it("does not warn about a widget that only reads a sensor", () => {
			addWidget("indicator", "cpt_psce_c");
			expect(analyseScene3d(project)).toEqual([]);
		});
	});

	it("is part of the project analysis", () => {
		project.scene3d!.bindings.t1 = "gone";
		const result = ProjectAnalyser.analyse(project);
		expect(
			result.issues.some((i) => i.code === "SCENE3D_BINDING_VARIABLE_MISSING"),
		).toBe(true);
	});
});
