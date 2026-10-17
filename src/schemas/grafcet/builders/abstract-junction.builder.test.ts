import JunctionAndStart from "../junction-and-start.schema";
import JunctionOrEnd from "../junction-or-end.schema";
import JunctionAndStartBuilder from "./junction-and-start.builder";
import JunctionOrEndBuilder from "./junction-or-end.builder";

describe("AbstractJunctionBuilder", () => {
	it("construit le type concret de la sous-classe", () => {
		expect(new JunctionAndStartBuilder().id("a").build()).toBeInstanceOf(
			JunctionAndStart,
		);
		expect(new JunctionOrEndBuilder().id("o").build()).toBeInstanceOf(
			JunctionOrEnd,
		);
	});

	it("produit par défaut deux branches et un pivot centré", () => {
		const junction = new JunctionAndStartBuilder().id("a").build();
		expect(junction.id).toBe("a");
		expect(junction.data.branchesOrder).toHaveLength(2);
		expect(junction.data.pivotPosition).toBe(100);
		expect(junction.size).toEqual({ width: 200, height: 30 });
	});

	it.each([1, 2, 5])("nBranches(%i) crée n branches ordonnées", (n) => {
		const junction = new JunctionOrEndBuilder().nBranches(n).build();
		const { branches, branchesOrder } = junction.data;
		expect(branchesOrder).toHaveLength(n);
		const positions = branchesOrder.map((id) => branches[id].position);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	it("applique position, dimensions et pivotPosition", () => {
		const junction = new JunctionAndStartBuilder()
			.dimensions(300, 20)
			.pivotPosition(50)
			.position(40, 70)
			.build();
		expect(junction.position.y).toBe(70);
		expect(junction.size.height).toBe(20);
		expect(junction.data.pivotPosition).toBe(50);
	});
});
