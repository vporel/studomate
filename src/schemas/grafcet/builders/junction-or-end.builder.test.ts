import JunctionOrEndBuilder from "./junction-or-end.builder";

describe("JunctionOrEndBuilder", () => {
	it("positionne les branches dans l'ordre de branchesOrder, ramenées à la forme canonique", () => {
		const junction = new JunctionOrEndBuilder()
			.id("or-1")
			.dimensions(360, 30)
			.nBranches(3)
			.branchesPositions(20, 180, 340)
			.build();

		const [first, second, third] = junction.data.branchesOrder;
		// build() normalise : première branche à la marge (10), largeur calée sur la dernière.
		expect(junction.data.branches[first].position).toBe(10);
		expect(junction.data.branches[second].position).toBe(170);
		expect(junction.data.branches[third].position).toBe(330);
		expect(junction.size.width).toBe(340);
	});

	it("rejette un nombre de positions différent du nombre de branches", () => {
		expect(() =>
			new JunctionOrEndBuilder().id("or-1").branchesPositions(10),
		).toThrow();
	});
});
