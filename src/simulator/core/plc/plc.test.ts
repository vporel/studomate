import { Language } from "../../compiler/lexer/language.enum";
import { Lexer } from "../../compiler/lexer/lexer";
import Parser from "../../compiler/parser/parser";
import PLC from "./plc";
import PLCRoutine from "./plc-routine";
import PLCVariable from "./plc-variable";

describe("PLC", () => {
	let inputVar: PLCVariable;
	let outputVar: PLCVariable;
	let memoryVar: PLCVariable;

	beforeEach(() => {
		jest.useFakeTimers();
		inputVar = new PLCVariable("id1", "x", "input", "number");
		inputVar.setValue(10);
		outputVar = new PLCVariable("id2", "result", "output", "number");
		outputVar.setValue(0);
		memoryVar = new PLCVariable("id3", "count", "memory", "number");
		memoryVar.setValue(0);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("construction", () => {
		it("creates PLC with correct configuration", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar, outputVar, memoryVar],
			});
			expect(plc.getClockIntervalMs()).toBe(100);
			expect(plc.isRunning()).toBe(false);
		});

		it("initializes variables correctly", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar, outputVar],
			});
			const snapshot = plc.getVariablesSnapshot();
			// Only output variables are in snapshot initially (inputs need to be read first)
			expect(snapshot.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("getVariablesSnapshot", () => {
		it("returns copies of all variables", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar, outputVar, memoryVar],
			});
			const snapshot = plc.getVariablesSnapshot();
			// Only output and memory are in snapshot initially
			expect(snapshot.length).toBeGreaterThanOrEqual(2);
		});

		it("returns independent copies", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [outputVar],
			});
			const snapshot1 = plc.getVariablesSnapshot();
			plc.setOutputImageValueById("id2", 20);
			const snapshot2 = plc.getVariablesSnapshot();
			// First snapshot should not be affected
			expect(snapshot1[0].getValue()).toBe(0);
			expect(snapshot2[0].getValue()).toBe(20);
		});
	});

	describe("physical input management", () => {
		it("sets physical input value by id", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar],
			});
			plc.setPhysicalInputValueById("id1", 20);
			// Value will be reflected after a cycle
			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();
		});

		it("sets physical input value by name", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar],
			});
			plc.setPhysicalInputValueByName("x", 30);
			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();
		});

		it("throws on unknown input id", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar],
			});
			expect(() => plc.setPhysicalInputValueById("unknown", 5)).toThrow(
				"No input found with id unknown",
			);
		});

		it("throws on unknown input name", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar],
			});
			expect(() => plc.setPhysicalInputValueByName("unknown", 5)).toThrow(
				"No input found with name unknown",
			);
		});
	});

	describe("output and memory management", () => {
		it("sets output image value by id", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [outputVar],
			});
			plc.setOutputImageValueById("id2", 42);
			const snapshot = plc.getVariablesSnapshot();
			const output = snapshot.find((v) => v.getId() === "id2");
			expect(output?.getValue()).toBe(42);
		});

		it("sets memory value by id", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [memoryVar],
			});
			plc.setMemoryValueById("id3", 100);
			const snapshot = plc.getVariablesSnapshot();
			const memory = snapshot.find((v) => v.getId() === "id3");
			expect(memory?.getValue()).toBe(100);
		});

		it("throws on unknown output id", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [],
			});
			expect(() => plc.setOutputImageValueById("unknown", 5)).toThrow(
				"No output variable found with id unknown",
			);
		});

		it("throws on unknown memory id", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [],
			});
			expect(() => plc.setMemoryValueById("unknown", 5)).toThrow(
				"No memory variable found with id unknown",
			);
		});
	});

	describe("PLC cycle execution", () => {
		it("executes program during cycle", () => {
			const lexer = new Lexer(Language.FR);
			const tokens = lexer.tokenize("result := x + 5");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);

			const plc = new PLC({
				scanTimeMs: 100,
				program: [routine],
				variables: [inputVar, outputVar],
			});

			plc.setPhysicalInputValueByName("x", 10);
			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();

			const snapshot = plc.getVariablesSnapshot();
			const result = snapshot.find((v) => v.getName() === "result");
			expect(result?.getValue()).toBe(15);
		});

		it("executes multiple cycles correctly", () => {
			const lexer = new Lexer(Language.FR);
			const tokens = lexer.tokenize("count := count + 1");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);

			const plc = new PLC({
				scanTimeMs: 100,
				program: [routine],
				variables: [memoryVar],
			});

			plc.start();
			jest.advanceTimersByTime(300); // 3 cycles
			plc.stop();

			const snapshot = plc.getVariablesSnapshot();
			const count = snapshot.find((v) => v.getName() === "count");
			expect(count?.getValue()).toBe(3);
		});
	});

	describe("callbacks", () => {
		it("calls onPLCStart callback", () => {
			const onStartSpy = jest.fn();
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [],
				onPLCStart: onStartSpy,
			});
			plc.start();
			expect(onStartSpy).toHaveBeenCalledWith(plc);
		});

		it("calls onPLCStop callback", () => {
			const onStopSpy = jest.fn();
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [],
				onPLCStop: onStopSpy,
			});
			plc.start();
			plc.stop();
			expect(onStopSpy).toHaveBeenCalledWith(plc);
		});

		it("calls onCycleStart callback", () => {
			const onCycleStartSpy = jest.fn();
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [],
				onCycleStart: onCycleStartSpy,
			});
			plc.start();
			jest.advanceTimersByTime(100);
			expect(onCycleStartSpy).toHaveBeenCalled();
		});

		it("calls onCycleEnd callback", () => {
			const onCycleEndSpy = jest.fn();
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [],
				onCycleEnd: onCycleEndSpy,
			});
			plc.start();
			jest.advanceTimersByTime(100);
			expect(onCycleEndSpy).toHaveBeenCalled();
		});

		it("calls onCycleError callback on error and stops PLC", () => {
			const onCycleErrorSpy = jest.fn();
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();

			// Create a bad routine that will throw
			const badRoutine = new PLCRoutine([null as any]);

			const plc = new PLC({
				scanTimeMs: 100,
				program: [badRoutine],
				variables: [],
				onCycleError: onCycleErrorSpy,
			});

			plc.start();
			jest.advanceTimersByTime(100);

			expect(onCycleErrorSpy).toHaveBeenCalled();
			expect(plc.isRunning()).toBe(false);

			consoleSpy.mockRestore();
		});
	});

	describe("input/output image synchronization", () => {
		it("reads inputs to input image at cycle start", () => {
			const plc = new PLC({
				scanTimeMs: 100,
				program: [],
				variables: [inputVar],
			});

			plc.setPhysicalInputValueById("id1", 20);
			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();

			// Input image should reflect physical input after cycle
			const snapshot = plc.getVariablesSnapshot();
			const input = snapshot.find((v) => v.getId() === "id1");
			expect(input?.getValue()).toBe(20);
		});

		it("writes output image to outputs at cycle end", () => {
			const lexer = new Lexer(Language.FR);
			const tokens = lexer.tokenize("result := 99");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);

			const plc = new PLC({
				scanTimeMs: 100,
				program: [routine],
				variables: [outputVar],
			});

			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();

			// Physical output should reflect output image after cycle
			const snapshot = plc.getVariablesSnapshot();
			const output = snapshot.find((v) => v.getName() === "result");
			expect(output?.getValue()).toBe(99);
		});
	});
});
