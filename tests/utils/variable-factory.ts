import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import Variable from "@/schemas/variable/variable.schema";

/**
 * Factory for creating test variables with auto-generated IDs
 * Uses static methods from VariableBuilder for common variable patterns
 */
export class VariableFactory {
	private static counter = 0;

	static reset(): void {
		this.counter = 0;
	}

	static createLogicInput(mnemonic: string, id?: string): Variable {
		const varId = id || `input-${this.counter++}`;
		return VariableBuilder.buildLogicInput(varId, mnemonic);
	}

	static createLogicOutput(mnemonic: string, id?: string): Variable {
		const varId = id || `output-${this.counter++}`;
		return VariableBuilder.buildLogicOutput(varId, mnemonic);
	}

	static createMemoryBool(mnemonic: string, id?: string): Variable {
		const varId = id || `memory-${this.counter++}`;
		return VariableBuilder.buildMemoryBool(varId, mnemonic);
	}

	static createMemoryInt(mnemonic: string, id?: string): Variable {
		const varId = id || `memory-${this.counter++}`;
		return VariableBuilder.buildMemoryInt(varId, mnemonic);
	}

	static createAnalogInput(mnemonic: string, id?: string): Variable {
		const varId = id || `analog-input-${this.counter++}`;
		return VariableBuilder.buildAnalogInput(varId, mnemonic);
	}

	static createAnalogOutput(mnemonic: string, id?: string): Variable {
		const varId = id || `analog-output-${this.counter++}`;
		return VariableBuilder.buildAnalogOutput(varId, mnemonic);
	}
}
