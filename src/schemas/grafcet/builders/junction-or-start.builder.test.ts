import JunctionOrStartBuilder from "./junction-or-start.builder";

describe("JunctionOrStartBuilder", () => {
	it("positionne les branches dans l'ordre de branchesOrder, ramenées à la forme canonique", () => {
		const junction = new JunctionOrStartBuilder()
			.id("or-1")
			.dimensions(360, 30)
			.branchesPositions(20, 340)
			.build();

		const [first, second] = junction.data.branchesOrder;
		// build() normalise : première branche à la marge (10), largeur calée sur la dernière.
		expect(junction.data.branches[first].position).toBe(10);
		expect(junction.data.branches[second].position).toBe(330);
		expect(junction.size.width).toBe(340);
	});

	it("rejette un nombre de positions différent du nombre de branches", () => {
		expect(() =>
			new JunctionOrStartBuilder().id("or-1").branchesPositions(10),
		).toThrow();
	});
});
