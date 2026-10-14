import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";

export default class StepVariableGenerator {
	static stepVariableMnemonic(n: number): string {
		return `X${n}`;
	}

	static generate(stepId: string, n: number, dialect: Dialect): Variable {
		return new Variable({
			id: `step-${stepId}`,
			mnemonic: StepVariableGenerator.stepVariableMnemonic(n),
			zone: "memory",
			type: "BOOL",
			dialect,
		});
	}
}
