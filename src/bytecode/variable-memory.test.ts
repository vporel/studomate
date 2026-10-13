import { compiledProject, plcVariable } from "@tests/utils/bytecode-program";
import { NativeVm } from "@tests/utils/native-vm";
import generateBytecode from "./bytecode.generator";
import decodeVariableMemory, { variableMemorySize } from "./variable-memory";

function build() {
	const variables = [
		plcVariable("d:DINT"),
		plcVariable("w:WORD"),
		plcVariable("i:INT"),
		plcVariable("b1:BOOL"),
		plcVariable("t:TIME"),
		plcVariable("dw:DWORD"),
		plcVariable("m:internal-number"),
		plcVariable("b2:internal-bool"),
	];
	const image = generateBytecode({
		compiled: compiledProject({
			variables,
			routines: [
				[
					"d := d",
					"w := w",
					"i := i",
					"b1 := b1",
					"t := t",
					"dw := dw",
					"m := m",
					"b2 := b2",
				],
			],
		}),
		ioBindings: [],
		cyclePeriodMs: 100,
	});
	return { image, vm: new NativeVm(image.bytes) };
}

describe("variableMemorySize", () => {
	it("counts 1 byte per boolean, 2 per INT and WORD, 4 per 32-bit variable", () => {
		const { image } = build();
		expect(variableMemorySize(image.layout)).toBe(2 + 2 * 2 + 4 * 4);
	});
});

describe("decodeVariableMemory", () => {
	it("lists every variable with its class and type, in index order", () => {
		const { image } = build();
		expect(
			image.layout.variables.map(({ name, storageClass }) => [
				name,
				storageClass,
			]),
		).toEqual([
			["b1", "bool"],
			["b2", "bool"],
			["i", "int"],
			["w", "word"],
			["d", "int32"],
			["t", "int32"],
			["dw", "int32"],
			["m", "int32"],
		]);
		expect(image.layout.variables.map(({ index }) => index)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7,
		]);
	});

	it("reads back what the VM holds, with the sign and type of each variable", () => {
		const { image, vm } = build();
		const at = image.layout.variableIndexByName;
		const [dump] = vm.memoryAfterEachCycle([
			`set ${at.b1} 1`,
			`set ${at.i} -5`,
			`set ${at.w} 65000`,
			`set ${at.d} -2000000000`,
			`set ${at.t} 5000`,
			`set ${at.dw} 4000000000`,
			`set ${at.m} -7`,
			"cycle",
		]);

		expect(decodeVariableMemory(image.layout, dump.memory)).toEqual({
			b1: true,
			b2: false,
			i: -5,
			w: 65000,
			d: -2000000000,
			t: 5000,
			dw: 4000000000,
			m: -7,
		});
	});

	it("reports one more cycle each time the VM runs", () => {
		const { vm } = build();
		const dumps = vm.memoryAfterEachCycle(["cycle", "cycle", "cycle"]);
		expect(dumps.map((dump) => dump.cycle)).toEqual([1, 2, 3]);
	});

	it("refuses a memory of the wrong size", () => {
		const { image } = build();
		expect(() => decodeVariableMemory(image.layout, new Uint8Array(3))).toThrow(
			RangeError,
		);
	});
});
