import Variable from "@/schemas/variable/variable.schema";
import { buildEnvironmentCached } from "./build-environment.helper";

describe("buildEnvironmentCached", () => {
	it("returns the same Environment instance for the same array reference", () => {
		const variables: Variable[] = [];
		const env1 = buildEnvironmentCached(variables);
		const env2 = buildEnvironmentCached(variables);
		expect(env1).toBe(env2);
	});

	it("returns a different Environment instance for a different array reference", () => {
		const env1 = buildEnvironmentCached([]);
		const env2 = buildEnvironmentCached([]);
		expect(env1).not.toBe(env2);
	});
});
