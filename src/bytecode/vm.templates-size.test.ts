import { UNO_PIN_RANGE } from "@tests/utils/bytecode-program";
import arduinoUnoR3 from "@/hardware/arduino/uno-r3.descriptor";
import { PROJECT_TEMPLATES } from "@/templates";
import { compileProject } from "@tests/utils/test-helpers";
import { NativeVm } from "@tests/utils/native-vm";
import checkAdmissibility from "./bytecode.admissibility";
import generateBytecode from "./bytecode.generator";

function measure(id: string) {
	const template = PROJECT_TEMPLATES.find((candidate) => candidate.id === id)!;
	const project = template.solution!();
	// On a real maquette the sensors are wired: a plant model written in Ladder is not
	// embedded, and the Main that only calls it is emptied.
	const plantModel = Object.values(project.ladders).find(
		(ladder) => ladder.name === "Partie opérative",
	);
	if (plantModel) {
		plantModel.excludedFromExecution = true;
		project.main.sections.forEach((section) => (section.elements = []));
	}
	const compiled = compileProject(project)!;
	const image = generateBytecode({
		compiled,
		ioBindings: [],
		cyclePeriodMs: 100,
		pinRange: UNO_PIN_RANGE,
	});
	const opcodes = new NativeVm(image.bytes).opcodesPerCycle(
		Array(50).fill("cycle"),
	);
	const physicalIo = project.variables.filter(
		(variable) => variable.zone !== "memory",
	).length;
	return {
		image,
		report: checkAdmissibility(image, arduinoUnoR3.limits),
		physicalIo,
		opcodes,
	};
}

describe("size of the reference templates on the Uno R3", () => {
	it.each([
		["elevator", 800],
		["carton-sorting", 1000],
	])("%s fits the board with its sensors wired", (id, maxStorageBytes) => {
		const { image, report, physicalIo, opcodes } = measure(id);
		expect(report.issues).toEqual([]);
		// Each wired I/O variable adds one 3-byte entry to the image.
		const wiredImageBytes = image.layout.imageSize + 3 * physicalIo;
		expect(wiredImageBytes).toBeLessThanOrEqual(maxStorageBytes);
		expect(wiredImageBytes).toBeLessThanOrEqual(
			arduinoUnoR3.limits.programStorageBytes,
		);
		expect(Math.max(...opcodes)).toBeLessThan(400);
	});
});
