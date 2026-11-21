import { createUserProgramBlockElement } from "@/schemas/ladder/block.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { ProjectFactory } from "@tests/utils/project-factory";
import UserProgramBlockAnalyser from "./user-program-block.analyser";

describe("UserProgramBlockAnalyser", () => {
	beforeEach(() => ProjectFactory.reset());

	function analyseCallTo(configure: (called: Ladder) => void) {
		const project = ProjectFactory.createEmpty();
		const called = new Ladder("called", "Appelé");
		configure(called);
		project.addProgram(called);
		const main = Object.values(project.ladders).find((l) => l.role === "main")!;
		const block = createUserProgramBlockElement(called.id, 0, 0);
		main.addElements(main.sections[0].id, [block]);
		return UserProgramBlockAnalyser.analyse(
			block,
			{ sourceType: "ladder-block", sourceId: block.id, parentId: main.id },
			main,
			project,
		);
	}

	it("reports nothing for a call to an executed standard ladder", () => {
		expect(analyseCallTo(() => {})).toEqual([]);
	});

	it("reports BLOCK_PROGRAM_EXCLUDED for a call to a ladder excluded from execution", () => {
		const issues = analyseCallTo((called) => {
			called.excludedFromExecution = true;
		});

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_PROGRAM_EXCLUDED"]);
		expect(issues[0].severity).toBe("error");
	});

	it("reports BLOCK_PROGRAM_UNDECLARED for a call to an unknown program", () => {
		const project = ProjectFactory.createEmpty();
		const main = Object.values(project.ladders).find((l) => l.role === "main")!;
		const block = createUserProgramBlockElement("missing", 0, 0);
		main.addElements(main.sections[0].id, [block]);

		const issues = UserProgramBlockAnalyser.analyse(
			block,
			{ sourceType: "ladder-block", sourceId: block.id, parentId: main.id },
			main,
			project,
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_PROGRAM_UNDECLARED"]);
		expect(issues[0].severity).toBe("error");
	});

	it("reports BLOCK_PROGRAM_NOT_LADDER for a call to a grafcet", () => {
		const project = ProjectFactory.createEmpty();
		const grafcet = new Grafcet("g1", "Cycle");
		project.addProgram(grafcet);
		const main = Object.values(project.ladders).find((l) => l.role === "main")!;
		const block = createUserProgramBlockElement(grafcet.id, 0, 0);
		main.addElements(main.sections[0].id, [block]);

		const issues = UserProgramBlockAnalyser.analyse(
			block,
			{ sourceType: "ladder-block", sourceId: block.id, parentId: main.id },
			main,
			project,
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_PROGRAM_NOT_LADDER"]);
		expect(issues[0].params).toEqual({ programName: grafcet.name });
	});

	it("reports BLOCK_PROGRAM_IS_MAIN for a call to the Main", () => {
		const project = ProjectFactory.createEmpty();
		const main = Object.values(project.ladders).find((l) => l.role === "main")!;
		const block = createUserProgramBlockElement(main.id, 0, 0);
		main.addElements(main.sections[0].id, [block]);

		const issues = UserProgramBlockAnalyser.analyse(
			block,
			{ sourceType: "ladder-block", sourceId: block.id, parentId: main.id },
			main,
			project,
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_PROGRAM_IS_MAIN"]);
		expect(issues[0].params).toEqual({ programName: main.name });
	});

	describe("BLOCK_PROGRAM_DUPLICATE_REFERENCE", () => {
		function analyseTwoCalls(sameProgram: boolean) {
			const project = ProjectFactory.createEmpty();
			const called = new Ladder("called", "Appelé");
			const other = new Ladder("other", "Autre");
			project.addProgram(called);
			project.addProgram(other);
			const main = Object.values(project.ladders).find(
				(l) => l.role === "main",
			)!;
			const first = createUserProgramBlockElement(called.id, 0, 0);
			const second = createUserProgramBlockElement(
				sameProgram ? called.id : other.id,
				1,
				0,
			);
			main.addElements(main.sections[0].id, [first, second]);
			return UserProgramBlockAnalyser.analyse(
				first,
				{ sourceType: "ladder-block", sourceId: first.id, parentId: main.id },
				main,
				project,
			);
		}

		it("warns when two blocks of the same ladder call the same program", () => {
			const issues = analyseTwoCalls(true);

			expect(issues.map((i) => i.code)).toEqual([
				"BLOCK_PROGRAM_DUPLICATE_REFERENCE",
			]);
			expect(issues[0].severity).toBe("warning");
			expect(issues[0].params).toEqual({ programName: "Appelé" });
		});

		it("does not warn when the two blocks call different programs", () => {
			expect(analyseTwoCalls(false)).toEqual([]);
		});
	});
});
