import JunctionAndEnd from "./junction-and-end.schema";
import JunctionAndStart from "./junction-and-start.schema";
import JunctionOrEnd from "./junction-or-end.schema";
import JunctionOrStart from "./junction-or-start.schema";
import Junction from "./junction.schema";

describe("Junction.generateDefaultData", () => {
	it("crée deux branches ordonnées avec des ids distincts", () => {
		const data = Junction.generateDefaultData();

		expect(data.branchesOrder).toHaveLength(2);
		expect(new Set(data.branchesOrder).size).toBe(2);
		expect(Object.keys(data.branches).sort()).toEqual(
			[...data.branchesOrder].sort(),
		);
		expect(data.pivotPosition).toBe(Junction.DEFAULT_DIMENSIONS.width / 2);
	});

	it.each([
		["divergence en OU", JunctionOrStart],
		["convergence en OU", JunctionOrEnd],
		["divergence en ET", JunctionAndStart],
		["convergence en ET", JunctionAndEnd],
	])("%s naît avec deux branches", (_label, JunctionClass) => {
		expect(JunctionClass.generateDefaultData().branchesOrder).toHaveLength(2);
	});
});
