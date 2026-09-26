import { clamp } from "./number";

describe("clamp", () => {
	it("laisse passer une valeur dans l'intervalle", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it("ramène une valeur trop petite à min", () => {
		expect(clamp(-3, 0, 10)).toBe(0);
	});

	it("ramène une valeur trop grande à max", () => {
		expect(clamp(42, 0, 10)).toBe(10);
	});

	it("accepte les bornes comme valeurs", () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});

	it("gère un intervalle réduit à un point", () => {
		expect(clamp(7, 3, 3)).toBe(3);
	});

	it("laisse min l'emporter quand les bornes sont inversées", () => {
		expect(clamp(5, 10, 0)).toBe(10);
		expect(clamp(-5, 10, 0)).toBe(10);
		expect(clamp(50, 10, 0)).toBe(10);
	});
});
