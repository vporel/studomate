import generateBytecode from "@/bytecode/bytecode.generator";
import Project from "@/schemas/project/project.schema";
import {
	coil,
	no,
	or,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { input, output } from "@/templates/training/utils/training-variables";
import { UNO_PIN_RANGE } from "@tests/utils/bytecode-program";
import { compileProject } from "@tests/utils/test-helpers";

/** A rung `A -(B|C)- D -(E|F)- G ...` made of `diamonds` parallel groups in series. */
function buildDiamondChain(diamonds: number): Project {
	const project = new Project("p", "diamonds", "");
	project.variables.push(input("A"), output("Q"));
	const items = [no("A")];
	for (let i = 0; i < diamonds; i++) {
		project.variables.push(input(`B${i}`), input(`C${i}`), input(`D${i}`));
		items.push(or([no(`B${i}`)], [no(`C${i}`)]), no(`D${i}`));
	}
	setMainSections(project, [section("s", "", ...items, coil("Q"))]);
	return project;
}

function imageSize(diamonds: number): number {
	const compiled = compileProject(buildDiamondChain(diamonds))!;
	return generateBytecode({
		compiled,
		ioBindings: [],
		cyclePeriodMs: 100,
		pinRange: UNO_PIN_RANGE,
	}).layout.imageSize;
}

/**
 * Series-parallel rungs share their sub-expressions but every consumer walks them as a tree, so
 * the generated code doubles with each added group. Sizes measured at the time of writing: 198
 * bytes for 4 groups, 2.8 KB for 8, 45 KB for 12. The bounds below keep realistic rungs small and
 * flag any change that makes this growth worse.
 */
describe("bytecode size of parallel groups in series", () => {
	it("keeps a rung of 4 groups under 300 bytes", () => {
		expect(imageSize(4)).toBeLessThanOrEqual(300);
	});

	it("keeps a rung of 8 groups under 3.5 KB", () => {
		expect(imageSize(8)).toBeLessThanOrEqual(3500);
	});
});
