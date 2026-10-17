import Grafcet from "../grafcet.schema";
import ElementsAddCommand from "./elements-add.command";
import ElementsRemoveCommand from "./elements-remove.command";

const payload = [
	{
		type: "step" as const,
		id: "step-1",
		data: { number: 1 },
		position: { x: 5, y: 6 },
		size: { width: 10, height: 10 },
		extra: "ignoré",
	},
];

const expectedAdd = [
	{
		type: "step",
		id: "step-1",
		data: { number: 1 },
		position: { x: 5, y: 6 },
		size: { width: 10, height: 10 },
	},
];
const expectedRefs = [{ type: "step", id: "step-1" }];

function spied() {
	const grafcet = new Grafcet("g1", "G");
	const add = jest.spyOn(grafcet, "addElements").mockImplementation(() => {});
	const remove = jest
		.spyOn(grafcet, "removeElements")
		.mockImplementation(() => {});
	return { grafcet, add, remove };
}

describe("ElementsAddCommand / ElementsRemoveCommand", () => {
	it("add.execute ajoute avec les cinq champs seulement", () => {
		const { grafcet, add, remove } = spied();

		new ElementsAddCommand(payload as any).execute(grafcet);

		expect(add).toHaveBeenCalledWith(expectedAdd);
		expect(remove).not.toHaveBeenCalled();
	});

	it("add.cancel retire par type et id seulement", () => {
		const { grafcet, add, remove } = spied();

		new ElementsAddCommand(payload as any).cancel(grafcet);

		expect(remove).toHaveBeenCalledWith(expectedRefs);
		expect(add).not.toHaveBeenCalled();
	});

	it("remove.execute retire par type et id seulement", () => {
		const { grafcet, add, remove } = spied();

		new ElementsRemoveCommand(payload as any).execute(grafcet);

		expect(remove).toHaveBeenCalledWith(expectedRefs);
		expect(add).not.toHaveBeenCalled();
	});

	it("remove.cancel restaure avec les cinq champs seulement", () => {
		const { grafcet, add, remove } = spied();

		new ElementsRemoveCommand(payload as any).cancel(grafcet);

		expect(add).toHaveBeenCalledWith(expectedAdd);
		expect(remove).not.toHaveBeenCalled();
	});

	it("conserve les identifiants de type sérialisés", () => {
		expect(new ElementsAddCommand([]).getType()).toBe("grafcet-elements-add");
		expect(new ElementsRemoveCommand([]).getType()).toBe(
			"grafcet-elements-remove",
		);
	});
});
