import { Dialect } from "@/expression-language/dialect.enum";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { isHmiBindable } from "./hmi-bindable-variable";

describe("isHmiBindable", () => {
	const project = new Project("p", "n", "");
	project.variables = [
		new Variable({
			id: "k",
			mnemonic: "SEUIL",
			zone: "constant",
			type: "INT",
			value: "4",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "m",
			mnemonic: "Compteur",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		}),
	];

	it("refuses a constant", () => {
		expect(isHmiBindable(project, "SEUIL")).toBe(false);
	});

	it("accepts a memory variable, an unknown name and a missing project", () => {
		expect(isHmiBindable(project, "Compteur")).toBe(true);
		expect(isHmiBindable(project, "Inconnue")).toBe(true);
		expect(isHmiBindable(null, "SEUIL")).toBe(true);
	});
});
