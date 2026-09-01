import JunctionOrEndBuilder from "./junction-or-end.builder";

describe("JunctionOrEndBuilder", () => {
	it("positionne les branches dans l'ordre de branchesOrder", () => {
		const junction = new JunctionOrEndBuilder()
			.id("or-1")
			.dimensions(360, 30)
			.nBranches(3)
			.branchesPositions(20, 180, 340)
			.build();

		const [first, second, third] = junction.data.branchesOrder;
		expect(junction.data.branches[first].position).toBe(20);
		expect(junction.data.branches[second].position).toBe(180);
		expect(junction.data.branches[third].position).toBe(340);
	});

	it("rejette un nombre de positions différent du nombre de branches", () => {
		expect(() =>
			new JunctionOrEndBuilder().id("or-1").branchesPositions(10),
		).toThrow();
	});
});
