import { createTrafficLightSolution } from "@/templates/traffic-light.template";
import { sceneToSvg } from "./backends/svg-backend";
import grafcetToScene from "./grafcet-scene";

function firstGrafcet() {
	const project = createTrafficLightSolution();
	return Object.values(project.grafcets)[0];
}

describe("grafcetToScene — feu tricolore", () => {
	it("produit une scène à la taille de la page A4 (pas de zoom au contenu)", () => {
		const scene = grafcetToScene(firstGrafcet());
		// A4 portrait à 96 DPI ≈ 794 × 1123 px.
		expect(scene.width).toBeGreaterThan(700);
		expect(scene.height).toBeGreaterThan(1000);
		// Les éléments gardent leur position d'origine sur la page (étape 0 vers X ≈ 200).
		const step0 = scene.ops.find(
			(o) => o.op === "rect" && o.w === 40 && o.h === 40,
		) as { x: number } | undefined;
		expect(step0!.x).toBeGreaterThan(150);
		for (const op of scene.ops) {
			if (op.op === "polyline")
				for (const [x, y] of op.points) {
					expect(x).toBeGreaterThanOrEqual(0);
					expect(y).toBeGreaterThanOrEqual(0);
				}
		}
	});

	it("dessine un rect par étape et par action, une ligne par transition", () => {
		const scene = grafcetToScene(firstGrafcet());
		const rects = scene.ops.filter((o) => o.op === "rect");
		// 3 étapes (dont l'initiale = 2 rects) + 3 actions = 7
		expect(rects).toHaveLength(7);
		const texts = scene.ops.filter((o) => o.op === "text").map((o) => (o as { text: string }).text);
		expect(texts).toEqual(
			expect.arrayContaining(["0", "1", "2", "vert", "orange", "rouge", "t0/X0/10s"]),
		);
	});

	it("produit une polyline par connexion", () => {
		const grafcet = firstGrafcet();
		const scene = grafcetToScene(grafcet);
		const polylines = scene.ops.filter((o) => o.op === "polyline");
		expect(polylines).toHaveLength(grafcet.connections.length);
	});

	it("la boucle de retour t2 → e0 contourne par la gauche (x minimal < étapes)", () => {
		const grafcet = firstGrafcet();
		const scene = grafcetToScene(grafcet);
		const stepRects = scene.ops.filter(
			(o) => o.op === "rect" && o.w === 40 && o.h === 40,
		) as { x: number }[];
		const minStepX = Math.min(...stepRects.map((r) => r.x));
		const loopPolyline = (scene.ops.filter((o) => o.op === "polyline") as {
			points: [number, number][];
		}[]).find((p) => p.points.length === 6);
		expect(loopPolyline).toBeDefined();
		const loopMinX = Math.min(...loopPolyline!.points.map((p) => p[0]));
		expect(loopMinX).toBeLessThan(minStepX);
	});

	it("le backend SVG sérialise la scène (snapshot)", () => {
		expect(sceneToSvg(grafcetToScene(firstGrafcet()))).toMatchSnapshot();
	});
});
