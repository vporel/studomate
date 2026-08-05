import BlocksBuilder from "./blocks.builder";
import IdentifiersBuilder from "./identifiers.builder";
import LiteralsBuilder from "./literals.builder";

describe("BlocksBuilder", () => {
	describe("buildTimerNode", () => {
		it("creates TON timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("startButton", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastStartButton", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(1000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("timerDone", 20);

			const node = BlocksBuilder.buildTimerNode(
				"TON",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
				0,
			);

			expect(node.type).toBe("TIMER_BLOCK");
			expect(node.timerType).toBe("TON");
			expect(node.input).toBe(input);
			expect(node.lastInput).toBe(lastInput);
			expect(node.presetTime).toBe(presetTime);
			expect(node.elapsedTime).toBe(elapsedTime);
			expect(node.output).toBe(output);
			expect(node.position).toBe(0);
			expect(node.id).toBeDefined();
		});

		it("creates TOF timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastInput", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(500, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("output", 20);

			const node = BlocksBuilder.buildTimerNode(
				"TOF",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);

			expect(node.timerType).toBe("TOF");
		});

		it("creates TP timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("pulse", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastPulse", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(2000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("pulseOut", 20);

			const node = BlocksBuilder.buildTimerNode(
				"TP",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);

			expect(node.timerType).toBe("TP");
		});

		it("creates timer node without position", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastInput", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(1000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("output", 20);

			const node = BlocksBuilder.buildTimerNode(
				"TON",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);

			expect(node.position).toBeUndefined();
		});

		it("generates unique IDs for each timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastInput", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(1000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("output", 20);

			const node1 = BlocksBuilder.buildTimerNode(
				"TON",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);
			const node2 = BlocksBuilder.buildTimerNode(
				"TON",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);

			expect(node1.id).not.toBe(node2.id);
		});
	});

	describe("buildTimerStringDeclarationNode", () => {
		it("creates timer string declaration node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("startButton", 0);
			const node = BlocksBuilder.buildTimerStringDeclarationNode("myTimer", input, 1500, 0);

			expect(node.type).toBe("TIMER_STRING_DECLARATION");
			expect(node.name).toBe("myTimer");
			expect(node.input).toBe(input);
			expect(node.presetTime).toBe(1500);
			expect(node.position).toBe(0);
			expect(node.id).toBeDefined();
		});

		it("creates timer string declaration with different names", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const node1 = BlocksBuilder.buildTimerStringDeclarationNode("timer1", input, 1000);
			const node2 = BlocksBuilder.buildTimerStringDeclarationNode("timer2", input, 2000);

			expect(node1.name).toBe("timer1");
			expect(node2.name).toBe("timer2");
		});

		it("creates timer string declaration with zero preset time", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const node = BlocksBuilder.buildTimerStringDeclarationNode("instantTimer", input, 0);

			expect(node.presetTime).toBe(0);
		});

		it("creates timer string declaration with large preset time", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const node = BlocksBuilder.buildTimerStringDeclarationNode("longTimer", input, 999999);

			expect(node.presetTime).toBe(999999);
		});

		it("creates timer string declaration without position", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const node = BlocksBuilder.buildTimerStringDeclarationNode("timer", input, 1000);

			expect(node.position).toBeUndefined();
		});

		it("generates unique IDs for each timer string declaration node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const node1 = BlocksBuilder.buildTimerStringDeclarationNode("timer", input, 1000);
			const node2 = BlocksBuilder.buildTimerStringDeclarationNode("timer", input, 1000);

			expect(node1.id).not.toBe(node2.id);
		});
	});
});
