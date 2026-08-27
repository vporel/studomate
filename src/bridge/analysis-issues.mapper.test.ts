import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import AnalysisIssuesMapper, {
	emptyAnalysisIssues,
} from "./analysis-issues.mapper";

describe("emptyAnalysisIssues", () => {
	it("returns an empty structure", () => {
		expect(emptyAnalysisIssues()).toEqual({
			project: [],
			grafcets: {},
			ladders: {},
		});
	});
});

describe("AnalysisIssuesMapper.analyserToApp", () => {
	it("returns an empty structure for no issues", () => {
		expect(AnalysisIssuesMapper.analyserToApp([])).toEqual(
			emptyAnalysisIssues(),
		);
	});

	it("routes project-level issues to the project bucket", () => {
		const issue = new ProjectAnalyserIssue(
			"error",
			"PROJECT_DUPLICATE_STEP_NUMBER_ACROSS_GRAFCETS",
			{ sourceType: "project", sourceId: "project-1" },
			"Numéro d'étape dupliqué",
		);
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.project).toEqual(["Numéro d'étape dupliqué"]);
		expect(result.grafcets).toEqual({});
		expect(result.ladders).toEqual({});
	});

	it("routes grafcet-level issues to that grafcet's overall bucket", () => {
		const issue = new ProjectAnalyserIssue(
			"error",
			"GRAFCET_NO_INITIAL_STEP",
			{ sourceType: "grafcet", sourceId: "grafcet-1" },
			"Aucune étape initiale",
		);
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.grafcets["grafcet-1"]).toEqual({
			overall: ["Aucune étape initiale"],
			elements: {},
		});
		expect(result.ladders).toEqual({});
	});

	it("routes element-level issues to the element bucket of their parent grafcet", () => {
		const issue = new ProjectAnalyserIssue(
			"error",
			"STEP_NO_SUCCESSOR",
			{ sourceType: "grafcet-step", sourceId: "step-1", parentId: "grafcet-1" },
			"Aucun élément en aval",
		);
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.grafcets["grafcet-1"]).toEqual({
			overall: [],
			elements: { "step-1": ["Aucun élément en aval"] },
		});
	});

	it("accumulates multiple messages for the same element", () => {
		const source = {
			sourceType: "grafcet-step" as const,
			sourceId: "step-1",
			parentId: "grafcet-1",
		};
		const issues = [
			new ProjectAnalyserIssue(
				"error",
				"STEP_NO_SUCCESSOR",
				source,
				"Aucun élément en aval",
			),
			new ProjectAnalyserIssue(
				"error",
				"STEP_NO_PREDECESSOR",
				source,
				"Aucun élément en amont",
			),
		];
		const result = AnalysisIssuesMapper.analyserToApp(issues);
		expect(result.grafcets["grafcet-1"].elements["step-1"]).toEqual([
			"Aucun élément en aval",
			"Aucun élément en amont",
		]);
	});

	it("groups issues from different grafcets separately", () => {
		const issues = [
			new ProjectAnalyserIssue(
				"error",
				"GRAFCET_NO_INITIAL_STEP",
				{ sourceType: "grafcet", sourceId: "grafcet-1" },
				"Erreur grafcet 1",
			),
			new ProjectAnalyserIssue(
				"error",
				"GRAFCET_NO_INITIAL_STEP",
				{ sourceType: "grafcet", sourceId: "grafcet-2" },
				"Erreur grafcet 2",
			),
		];
		const result = AnalysisIssuesMapper.analyserToApp(issues);
		expect(Object.keys(result.grafcets).sort()).toEqual([
			"grafcet-1",
			"grafcet-2",
		]);
		expect(result.grafcets["grafcet-1"].overall).toEqual(["Erreur grafcet 1"]);
		expect(result.grafcets["grafcet-2"].overall).toEqual(["Erreur grafcet 2"]);
	});

	it("routes ladder-level issues to that ladder's overall bucket, never into grafcets", () => {
		const issue = new ProjectAnalyserIssue(
			"warning",
			"COIL_DUPLICATE_NORMAL_ASSIGNMENT",
			{ sourceType: "ladder", sourceId: "ladder-1" },
			"Variable pilotée deux fois",
		);
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.ladders["ladder-1"]).toEqual({
			overall: ["Variable pilotée deux fois"],
			elements: {},
		});
		expect(result.grafcets).toEqual({});
	});

	it("routes ladder element-level issues (contact/coil) to the element bucket of their parent ladder", () => {
		const issue = new ProjectAnalyserIssue(
			"error",
			"ELEMENT_NO_PREDECESSOR",
			{
				sourceType: "ladder-contact",
				sourceId: "contact-1",
				parentId: "ladder-1",
			},
			"Cet élément n'est relié à aucun élément précédent.",
		);
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.ladders["ladder-1"]).toEqual({
			overall: [],
			elements: {
				"contact-1": ["Cet élément n'est relié à aucun élément précédent."],
			},
		});
		expect(result.grafcets).toEqual({});
	});
});
