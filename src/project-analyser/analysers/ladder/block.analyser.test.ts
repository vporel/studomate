import { createCompareBlockElement } from "@/schemas/ladder/block.schema";
import { createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { createSectionWith, wireInSeries } from "@tests/utils/ladder-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import BlockAnalyser from "./block.analyser";

describe("BlockAnalyser", () => {
	const analyser = new BlockAnalyser();
	const project = ProjectFactory.createEmpty();

	function analyse(ladder: Ladder, blockId: string) {
		const block = ladder.getAllElements().find((e) => e.id === blockId)!;
		return analyser.analyseInContext(
			block as never,
			ladder,
			new Map(),
			project,
		);
	}

	it("signale LADDER_ELEMENT_NO_PREDECESSOR quand le bloc n'a aucune connexion entrante", () => {
		const block = createCompareBlockElement(0, 0, {
			in1: "1",
			in2: "0",
			operator: ">",
		});
		const ladder = new Ladder("l1", "L", [createSectionWith([block])]);

		expect(analyse(ladder, block.id).map((i) => i.code)).toContain(
			"LADDER_ELEMENT_NO_PREDECESSOR",
		);
	});

	it("ne signale rien quand le bloc est câblé au rail d'alimentation", () => {
		const rail = createRailTerminalElement(0);
		const block = createCompareBlockElement(0, 1, {
			in1: "1",
			in2: "0",
			operator: ">",
		});
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, block], wireInSeries([rail, block])),
		]);

		expect(analyse(ladder, block.id).map((i) => i.code)).not.toContain(
			"LADDER_ELEMENT_NO_PREDECESSOR",
		);
	});
});
