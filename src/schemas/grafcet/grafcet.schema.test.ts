import { GRAFCET_ELEMENT_TYPES } from "./element.schema";
import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "./grafcet.schema";

/**
 * Ces tests portent sur l'invariant introduit en §1.6 : une table unique pilote la
 * correspondance type d'élément → collection, et les trois opérations qui l'utilisent
 * (`getTypeToElementsMap`, `copy`, `createFromJSON`).
 *
 * Ils sont écrits pour rester valables quand un type d'élément sera ajouté : ils parcourent
 * `GRAFCET_ELEMENT_TYPES` au lieu d'énumérer les types à la main — ce qui était précisément
 * le défaut corrigé.
 */
function grafcetWithOneElementOfEachType(): Grafcet {
	const grafcet = new Grafcet("g1", "Grafcet", DEFAULT_GRAFCET_FORMAT);
	GRAFCET_ELEMENT_TYPES.forEach((type, index) => {
		grafcet.addElements([
			{
				type,
				id: `${type}-1`,
				data: { width: 10, height: 10 },
				position: { x: index, y: index },
			},
		]);
	});
	return grafcet;
}

describe("Grafcet — table des collections d'éléments", () => {
	describe("getTypeToElementsMap", () => {
		it("couvre tous les types déclarés", () => {
			const map = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT).getTypeToElementsMap();

			expect(Object.keys(map).sort()).toEqual([...GRAFCET_ELEMENT_TYPES].sort());
		});

		it("expose la collection réellement portée par le grafcet", () => {
			const grafcet = grafcetWithOneElementOfEachType();
			const map = grafcet.getTypeToElementsMap();

			// La collection retournée est bien celle du grafcet, pas une copie
			expect(map.step).toBe(grafcet.steps);
			expect(map.comment).toBe(grafcet.comments);
		});
	});

	describe("getElementsByType / getElementById", () => {
		it("retrouve un élément de chaque type", () => {
			const grafcet = grafcetWithOneElementOfEachType();

			for (const type of GRAFCET_ELEMENT_TYPES) {
				expect(grafcet.getElementsByType(type)).toHaveLength(1);
				expect(grafcet.getElementById(`${type}-1`)).toBeDefined();
				expect(grafcet.getElementByIdAndType(`${type}-1`, type)).toBeDefined();
			}
		});

		it("retourne undefined pour un identifiant inconnu", () => {
			expect(grafcetWithOneElementOfEachType().getElementById("inexistant")).toBeUndefined();
		});

		it("getAllElements rassemble un élément par type", () => {
			expect(grafcetWithOneElementOfEachType().getAllElements()).toHaveLength(
				GRAFCET_ELEMENT_TYPES.length,
			);
		});
	});

	describe("copy", () => {
		it("copie en profondeur chaque type d'élément", () => {
			const original = grafcetWithOneElementOfEachType();
			const copie = original.copy();

			for (const type of GRAFCET_ELEMENT_TYPES) {
				const source = original.getElementById(`${type}-1`)!;
				const copié = copie.getElementById(`${type}-1`)!;
				expect(copié).toBeDefined();
				expect(copié).not.toBe(source); // instance distincte
				expect(copié.id).toBe(source.id);
				expect(copié.type).toBe(source.type);
			}
		});

		it("isole la copie : modifier l'original ne la touche pas", () => {
			const original = grafcetWithOneElementOfEachType();
			const copie = original.copy();

			original.getElementById("step-1")!.position = { x: 999, y: 999 };

			expect(copie.getElementById("step-1")!.position).not.toEqual({ x: 999, y: 999 });
		});
	});

	describe("createFromJSON", () => {
		it("restitue un élément de chaque type", () => {
			const original = grafcetWithOneElementOfEachType();

			const restitué = Grafcet.createFromJSON(JSON.stringify(original));

			for (const type of GRAFCET_ELEMENT_TYPES) {
				const élément = restitué.getElementById(`${type}-1`);
				expect(élément).toBeDefined();
				expect(élément!.type).toBe(type);
			}
		});

		it("produit de vraies instances de schéma, pas des objets nus", () => {
			const original = grafcetWithOneElementOfEachType();

			const restitué = Grafcet.createFromJSON(JSON.stringify(original));

			// `copy` n'existe que sur les instances de schéma
			expect(typeof restitué.getElementById("step-1")!.copy).toBe("function");
		});

		it("tolère un grafcet dont les collections sont absentes", () => {
			const restitué = Grafcet.createFromJSON(JSON.stringify({ id: "g1", name: "G" }));

			expect(restitué.getAllElements()).toEqual([]);
			expect(restitué.connections).toEqual([]);
		});
	});
});
