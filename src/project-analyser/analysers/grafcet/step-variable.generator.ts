import Variable from "../../../schemas/variable/variable.schema";

export default class StepVariableGenerator {

  static stepVariableMnemonic(n: number): string {
    return `X${n}`;
  }

  static generate(stepId: string, n: number): Variable {
    return new Variable(
				`step-${stepId}`,
				StepVariableGenerator.stepVariableMnemonic(n),
				"memory",
				"BOOL",
			)
  }
}