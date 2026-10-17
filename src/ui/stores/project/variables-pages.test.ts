import { ZONES_TO_TYPES } from "@/schemas/variable/variable.schema";
import type { VariableZone } from "@/schemas/variable/variable.schema";
import enPages from "@/i18n/messages/en/pages.json";
import frPages from "@/i18n/messages/fr/pages.json";
import {
	getVariablesPageDefinition,
	getVariablesPageDefinitionForZone,
	isVariablesPageId,
	VARIABLES_PAGE_IDS,
	VARIABLES_PAGES,
} from "./variables-pages";

describe("VARIABLES_PAGES", () => {
	it("has unique ids and groups", () => {
		expect(new Set(VARIABLES_PAGES.map((p) => p.id)).size).toBe(
			VARIABLES_PAGES.length,
		);
		expect(new Set(VARIABLES_PAGES.map((p) => p.group)).size).toBe(
			VARIABLES_PAGES.length,
		);
	});

	it("assigns every variable zone to exactly one page", () => {
		const zones = Object.keys(ZONES_TO_TYPES) as VariableZone[];
		for (const zone of zones) {
			const owners = VARIABLES_PAGES.filter((p) =>
				(p.zones as readonly VariableZone[]).includes(zone),
			);
			expect(owners).toHaveLength(1);
			expect(getVariablesPageDefinitionForZone(zone).id).toBe(owners[0].id);
		}
	});

	it.each([
		["fr", frPages],
		["en", enPages],
	])("has every title key in the %s bundle", (_lang, bundle) => {
		for (const page of VARIABLES_PAGES)
			expect(Object.keys(bundle.titles)).toContain(page.titleKey);
	});
});

describe("isVariablesPageId", () => {
	it("accepts the page ids", () => {
		for (const id of VARIABLES_PAGE_IDS)
			expect(isVariablesPageId(id)).toBe(true);
		expect(VARIABLES_PAGE_IDS).toHaveLength(4);
	});

	it("rejects other ids", () => {
		expect(isVariablesPageId("program-1")).toBe(false);
		expect(isVariablesPageId("")).toBe(false);
	});
});

describe("getVariablesPageDefinition", () => {
	it("returns the group and columns of the page", () => {
		expect(getVariablesPageDefinition("input-variables").group).toBe("input");
		expect(getVariablesPageDefinition("constant-variables").group).toBe(
			"constant",
		);
		expect(getVariablesPageDefinition("constant-variables").columns).toBe(
			"declaredValue",
		);
		expect(getVariablesPageDefinition("memory-variables").columns).toBe(
			"address",
		);
	});
});
