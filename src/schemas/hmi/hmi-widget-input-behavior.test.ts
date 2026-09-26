import {
	getBehaviorImposedData,
	getExcludedBehaviorKinds,
	withBehaviorImposedData,
} from "./hmi-widget-input-behavior";
import { HmiWidget } from "./hmi-widget.schema";

describe("getBehaviorImposedData", () => {
	it("impose le mode impulsionnel NO/NF à un bouton poussoir lié à un bouton poussoir", () => {
		expect(getBehaviorImposedData("push-button", { kind: "push-button-no", params: null })).toEqual({
			behavior: "momentary-no",
		});
		expect(getBehaviorImposedData("push-button", { kind: "push-button-nc", params: null })).toEqual({
			behavior: "momentary-nc",
		});
	});

	it("impose le contact d'un interrupteur lié à un commutateur", () => {
		expect(getBehaviorImposedData("toggle-switch", { kind: "toggle-switch-no", params: null })).toEqual({
			contact: "no",
		});
		expect(getBehaviorImposedData("toggle-switch", { kind: "toggle-switch-nc", params: null })).toEqual({
			contact: "nc",
		});
	});

	it("impose les bornes d'un curseur à une saisie numérique", () => {
		expect(
			getBehaviorImposedData("numeric-input", { kind: "slider", params: { min: 5, max: 50 } }),
		).toEqual({ min: 5, max: 50 });
	});

	it("impose les bornes d'un curseur au widget curseur", () => {
		expect(
			getBehaviorImposedData("slider", { kind: "slider", params: { min: 5, max: 50 } }),
		).toEqual({ min: 5, max: 50 });
	});

	it("laisse le widget libre sans comportement ou pour un comportement qui ne le concerne pas", () => {
		expect(getBehaviorImposedData("push-button", null)).toBeNull();
		expect(getBehaviorImposedData("push-button", undefined)).toBeNull();
		expect(getBehaviorImposedData("gauge", { kind: "slider", params: { min: 0, max: 10 } })).toBeNull();
		expect(getBehaviorImposedData("indicator", { kind: "push-button-nc", params: null })).toBeNull();
		expect(
			getBehaviorImposedData("push-button", { kind: "toggle-switch-nc", params: null }),
		).toBeNull();
	});
});

describe("withBehaviorImposedData", () => {
	const widget = {
		id: "w1",
		type: "push-button",
		data: { variable: "arret", label: "Arrêt", behavior: "toggle" },
	} as unknown as HmiWidget;

	it("applique les champs imposés par-dessus les données stockées", () => {
		expect(withBehaviorImposedData(widget, { kind: "push-button-nc", params: null })).toEqual({
			variable: "arret",
			label: "Arrêt",
			behavior: "momentary-nc",
		});
	});

	it("renvoie les données stockées telles quelles sans comportement", () => {
		expect(withBehaviorImposedData(widget, null)).toBe(widget.data);
	});
});

describe("getExcludedBehaviorKinds", () => {
	it("écarte les commutateurs d'un bouton poussoir, et inversement", () => {
		expect(getExcludedBehaviorKinds("push-button")).toEqual(["toggle-switch-no", "toggle-switch-nc"]);
		expect(getExcludedBehaviorKinds("toggle-switch")).toEqual(["push-button-no", "push-button-nc"]);
		expect(getExcludedBehaviorKinds("numeric-input")).toEqual([]);
	});
});
