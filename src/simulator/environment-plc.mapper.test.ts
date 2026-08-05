import EnvVariable from "./interpreter/environment/env-variable";
import PLCVariable from "./core/plc/plc-variable";
import VariablesMapper from "./environment-plc.mapper";

describe("VariablesMapper", () => {
	describe("envToPlc", () => {
		it("converts EnvVariable to PLCVariable with correct mappings", () => {
			const envVar = new EnvVariable("id1", "var1", "number", "IN");
			envVar.setValue(42);

			const plcVar = VariablesMapper.envToPlc(envVar);

			expect(plcVar.getId()).toBe("id1");
			expect(plcVar.getName()).toBe("var1");
			expect(plcVar.getScope()).toBe("input");
			expect(plcVar.getType()).toBe("number");
			expect(plcVar.getValue()).toBe(42);
		});

		it("maps OUT direction to output scope", () => {
			const envVar = new EnvVariable("id2", "var2", "boolean", "OUT");
			const plcVar = VariablesMapper.envToPlc(envVar);
			expect(plcVar.getScope()).toBe("output");
		});

		it("maps INOUT direction to memory scope", () => {
			const envVar = new EnvVariable("id3", "var3", "string", "INOUT");
			const plcVar = VariablesMapper.envToPlc(envVar);
			expect(plcVar.getScope()).toBe("memory");
		});
	});

	describe("plcToEnv", () => {
		it("converts PLCVariable to EnvVariable with correct mappings", () => {
			const plcVar = new PLCVariable("id1", "var1", "input", "number");
			plcVar.setValue(100);

			const envVar = VariablesMapper.plcToEnv(plcVar);

			expect(envVar.getId()).toBe("id1");
			expect(envVar.getName()).toBe("var1");
			expect(envVar.getDirection()).toBe("IN");
			expect(envVar.getType()).toBe("number");
			expect(envVar.getValue()).toBe(100);
		});

		it("maps output scope to OUT direction", () => {
			const plcVar = new PLCVariable("id2", "var2", "output", "boolean");
			const envVar = VariablesMapper.plcToEnv(plcVar);
			expect(envVar.getDirection()).toBe("OUT");
		});

		it("maps memory scope to INOUT direction", () => {
			const plcVar = new PLCVariable("id3", "var3", "memory", "string");
			const envVar = VariablesMapper.plcToEnv(plcVar);
			expect(envVar.getDirection()).toBe("INOUT");
		});
	});

	describe("round-trip conversion", () => {
		it("preserves data when converting env->plc->env", () => {
			const original = new EnvVariable("id", "test", "number", "IN");
			original.setValue(123);

			const plcVar = VariablesMapper.envToPlc(original);
			const result = VariablesMapper.plcToEnv(plcVar);

			expect(result.getId()).toBe(original.getId());
			expect(result.getName()).toBe(original.getName());
			expect(result.getType()).toBe(original.getType());
			expect(result.getDirection()).toBe(original.getDirection());
			expect(result.getValue()).toBe(original.getValue());
		});
	});
});
