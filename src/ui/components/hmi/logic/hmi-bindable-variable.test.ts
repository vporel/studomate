import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { isHmiBindable, NON_BINDABLE_ZONES } from "./hmi-bindable-variable";

describe("isHmiBindable", () => {
	const project = new Project("p", "n", "");
	project.variables = [
		new Variable("k", "SEUIL", "constant", "INT", undefined, "4"),
		new Variable("m", "Compteur", "memory", "INT"),
	];

	it("refuses a constant", () => {
		expect(isHmiBindable(project, "SEUIL")).toBe(false);
	});

	it("accepts a memory variable, an unknown name and a missing project", () => {
		expect(isHmiBindable(project, "Compteur")).toBe(true);
		expect(isHmiBindable(project, "Inconnue")).toBe(true);
		expect(isHmiBindable(null, "SEUIL")).toBe(true);
	});

	it("excludes the constant zone from the selectors", () => {
		expect(NON_BINDABLE_ZONES).toEqual(["constant"]);
	});
});
