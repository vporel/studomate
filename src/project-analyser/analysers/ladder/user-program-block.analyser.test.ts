import { createUserProgramBlockElement } from "@/schemas/ladder/block.schema";
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
});
