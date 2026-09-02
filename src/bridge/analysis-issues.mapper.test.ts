import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import AnalysisIssuesMapper, {
	emptyAnalysisIssues,
} from "./analysis-issues.mapper";

const NO_INITIAL_STEP_FR = "Le grafcet ne contient aucune étape initiale.";
const NO_SUCCESSOR_FR = "L'étape n'a aucun élément en aval.";
const NO_PREDECESSOR_FR = "L'étape n'a aucun élément en amont.";

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
		const issue = new ProjectAnalyserIssue("error", "PROJECT_MISSING_MAIN", {
			sourceType: "project",
			sourceId: "project-1",
		});
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.project).toEqual(["Le projet ne porte aucun programme Main."]);
		expect(result.grafcets).toEqual({});
		expect(result.ladders).toEqual({});
	});

	it("renders the message in the requested locale", () => {
		const issue = new ProjectAnalyserIssue("error", "PROJECT_MISSING_MAIN", {
			sourceType: "project",
			sourceId: "project-1",
		});
		expect(AnalysisIssuesMapper.analyserToApp([issue], "en").project).toEqual([
			"The project has no Main program.",
		]);
	});

	it("interpolates the issue params", () => {
		const issue = new ProjectAnalyserIssue(
			"error",
			"PROJECT_MULTIPLE_MAINS",
			{ sourceType: "project", sourceId: "project-1" },
			{ count: 3 },
		);
		expect(AnalysisIssuesMapper.analyserToApp([issue]).project[0]).toContain(
			"3",
		);
	});

	it("routes grafcet-level issues to that grafcet's overall bucket", () => {
		const issue = new ProjectAnalyserIssue("error", "GRAFCET_NO_INITIAL_STEP", {
			sourceType: "grafcet",
			sourceId: "grafcet-1",
		});
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.grafcets["grafcet-1"]).toEqual({
			overall: [NO_INITIAL_STEP_FR],
			elements: {},
		});
		expect(result.ladders).toEqual({});
	});

	it("routes element-level issues to the element bucket of their parent grafcet", () => {
		const issue = new ProjectAnalyserIssue("error", "STEP_NO_SUCCESSOR", {
			sourceType: "grafcet-step",
			sourceId: "step-1",
			parentId: "grafcet-1",
		});
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.grafcets["grafcet-1"]).toEqual({
			overall: [],
			elements: { "step-1": [NO_SUCCESSOR_FR] },
		});
	});

	it("accumulates multiple messages for the same element", () => {
		const source = {
			sourceType: "grafcet-step" as const,
			sourceId: "step-1",
			parentId: "grafcet-1",
		};
		const issues = [
			new ProjectAnalyserIssue("error", "STEP_NO_SUCCESSOR", source),
			new ProjectAnalyserIssue("error", "STEP_NO_PREDECESSOR", source),
		];
		const result = AnalysisIssuesMapper.analyserToApp(issues);
		expect(result.grafcets["grafcet-1"].elements["step-1"]).toEqual([
			NO_SUCCESSOR_FR,
			NO_PREDECESSOR_FR,
		]);
	});

	it("groups issues from different grafcets separately", () => {
		const issues = [
			new ProjectAnalyserIssue("error", "GRAFCET_NO_INITIAL_STEP", {
				sourceType: "grafcet",
				sourceId: "grafcet-1",
			}),
			new ProjectAnalyserIssue("error", "GRAFCET_NO_INITIAL_STEP", {
				sourceType: "grafcet",
				sourceId: "grafcet-2",
			}),
		];
		const result = AnalysisIssuesMapper.analyserToApp(issues);
		expect(Object.keys(result.grafcets).sort()).toEqual([
			"grafcet-1",
			"grafcet-2",
		]);
		expect(result.grafcets["grafcet-1"].overall).toEqual([NO_INITIAL_STEP_FR]);
		expect(result.grafcets["grafcet-2"].overall).toEqual([NO_INITIAL_STEP_FR]);
	});

	it("routes ladder-level issues to that ladder's overall bucket, never into grafcets", () => {
		const issue = new ProjectAnalyserIssue(
			"warning",
			"LADDER_NOT_REFERENCED",
			{ sourceType: "ladder", sourceId: "ladder-1" },
			{ ladderName: "Sous-programme" },
		);
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.ladders["ladder-1"].overall).toHaveLength(1);
		expect(result.ladders["ladder-1"].elements).toEqual({});
		expect(result.grafcets).toEqual({});
	});

	it("routes ladder element-level issues (contact/coil) to the element bucket of their parent ladder", () => {
		const issue = new ProjectAnalyserIssue("error", "ELEMENT_NO_PREDECESSOR", {
			sourceType: "ladder-contact",
			sourceId: "contact-1",
			parentId: "ladder-1",
		});
		const result = AnalysisIssuesMapper.analyserToApp([issue]);
		expect(result.ladders["ladder-1"].elements["contact-1"]).toHaveLength(1);
		expect(result.grafcets).toEqual({});
	});
});
