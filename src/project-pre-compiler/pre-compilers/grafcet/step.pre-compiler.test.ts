import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepPreCompiler from "./step.pre-compiler";

describe("StepPreCompiler", () => {
	describe("preCompile", () => {
		it("compiles an initial step with step number 1", () => {
			const step = new StepBuilder().id("step-1").number(1).initial(true).build();

			const result = StepPreCompiler.preCompile(step);

			expect(result.node.type).toBe("IDENTIFIER");
			expect(result.node.value).toBe("X1");
			expect(result.initial).toBe(true);
		});

		it("compiles a non-initial step", () => {
			const step = new StepBuilder().id("step-1").number(5).initial(false).build();

			const result = StepPreCompiler.preCompile(step);

			expect(result.node.value).toBe("X5");
			expect(result.initial).toBe(false);
		});

		it("generates correct step variable mnemonics", () => {
			const step3 = new StepBuilder().id("step-3").number(3).build();
			const step10 = new StepBuilder().id("step-10").number(10).build();
			const step99 = new StepBuilder().id("step-99").number(99).build();

			const result3 = StepPreCompiler.preCompile(step3);
			const result10 = StepPreCompiler.preCompile(step10);
			const result99 = StepPreCompiler.preCompile(step99);

			expect(result3.node.value).toBe("X3");
			expect(result10.node.value).toBe("X10");
			expect(result99.node.value).toBe("X99");
		});

		it("sets initial to false when step.data.initial is undefined", () => {
			const step = new StepBuilder().id("step-1").number(1).build();

			const result = StepPreCompiler.preCompile(step);

			expect(result.initial).toBe(false);
		});
	});
});
