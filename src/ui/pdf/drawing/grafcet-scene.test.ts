import { createTrafficLightSolution } from "@/templates/traffic-light.template";
import { sceneToSvg } from "@/ui/lib/drawing/backends/svg-backend";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import CommentBuilder from "@/schemas/grafcet/builders/comment.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import { DrawOp } from "@/ui/lib/drawing/draw-op";
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
		const texts = scene.ops
			.filter((o) => o.op === "text")
			.map((o) => (o as { text: string }).text);
		expect(texts).toEqual(
			expect.arrayContaining([
				"0",
				"1",
				"2",
				"vert",
				"orange",
				"rouge",
				"t0/X0/5s",
			]),
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
		const loopPolyline = (
			scene.ops.filter((o) => o.op === "polyline") as {
				points: [number, number][];
			}[]
		).find((p) => p.points.length === 6);
		expect(loopPolyline).toBeDefined();
		const loopMinX = Math.min(...loopPolyline!.points.map((p) => p[0]));
		expect(loopMinX).toBeLessThan(minStepX);
	});

	it("le backend SVG sérialise la scène (snapshot)", () => {
		expect(sceneToSvg(grafcetToScene(firstGrafcet()))).toMatchSnapshot();
	});
});

describe("grafcetToScene: commentaires, renvois et divergences", () => {
	type LineOp = Extract<DrawOp, { op: "line" }>;
	type TextOp = Extract<DrawOp, { op: "text" }>;
	const lines = (ops: DrawOp[]) =>
		ops.filter((o): o is LineOp => o.op === "line");
	const texts = (ops: DrawOp[]) =>
		ops.filter((o): o is TextOp => o.op === "text");

	function sceneOf(...builders: ((b: GrafcetBuilder) => GrafcetBuilder)[]) {
		return grafcetToScene(
			builders.reduce((b, add) => add(b), new GrafcetBuilder()).build(),
		);
	}

	it("dessine le texte d'un commentaire dans un cadre en pointillés", () => {
		const scene = sceneOf((b) =>
			b.addComment(
				new CommentBuilder()
					.id("c")
					.text("Attention")
					.position(50, 60)
					.dimensions(120, 40)
					.build(),
			),
		);

		const frame = scene.ops.find((o) => o.op === "rect") as {
			x: number;
			y: number;
			dash?: number[];
		};
		expect(frame.dash).toBeDefined();
		expect(texts(scene.ops).map((t) => t.text)).toEqual(["Attention"]);
		expect(texts(scene.ops)[0]).toMatchObject({
			x: frame.x + 5,
			y: frame.y + 6,
		});
	});

	it("dessine le numéro de l'étape visée sous un tenant de renvoi", () => {
		const scene = sceneOf((b) =>
			b.addStepReferralSource(
				new StepReferralSourceBuilder()
					.id("rs")
					.targetStepNumber(7)
					.position(100, 100)
					.dimensions(30, 60)
					.build(),
			),
		);

		expect(texts(scene.ops)).toEqual([
			expect.objectContaining({ text: "7", x: 115, y: 158 }),
		]);
		expect(lines(scene.ops)).toHaveLength(1);
		expect(scene.ops.filter((o) => o.op === "polyline")).toHaveLength(1);
	});

	it("dessine le numéro de l'étape source au-dessus d'un aboutissant de renvoi", () => {
		const scene = sceneOf((b) =>
			b.addStepReferralTarget(
				new StepReferralTargetBuilder()
					.id("rt")
					.sourceStepNumber(3)
					.position(100, 100)
					.dimensions(30, 60)
					.build(),
			),
		);

		expect(texts(scene.ops)).toEqual([
			expect.objectContaining({ text: "3", x: 115, y: 110 }),
		]);
		const stem = lines(scene.ops)[0];
		expect(stem).toMatchObject({ x1: 115, y1: 120, x2: 115, y2: 160 });
	});

	it("un renvoi sans numéro dessine un texte vide", () => {
		const scene = sceneOf((b) =>
			b.addStepReferralSource(
				new StepReferralSourceBuilder().id("rs").position(0, 0).build(),
			),
		);

		expect(texts(scene.ops).map((t) => t.text)).toEqual([""]);
	});

	describe.each([
		[
			"divergence ET",
			JunctionAndStartBuilder,
			"addJunctionAndStart",
			2,
			"start",
		],
		["convergence ET", JunctionAndEndBuilder, "addJunctionAndEnd", 2, "end"],
		["divergence OU", JunctionOrStartBuilder, "addJunctionOrStart", 1, "start"],
		["convergence OU", JunctionOrEndBuilder, "addJunctionOrEnd", 1, "end"],
	] as const)("%s", (_label, Builder, adder, nBars, side) => {
		const junction = new Builder()
			.id("j")
			.position(300, 100)
			.dimensions(200, 30)
			.branchesPositions(10, 190)
			.pivotPosition(60)
			.build();
		const scene = grafcetToScene(
			(
				(new GrafcetBuilder() as any)[adder](junction) as GrafcetBuilder
			).build(),
		);
		const all = lines(scene.ops);
		const horizontal = all.filter((l) => l.y1 === l.y2);
		const vertical = all.filter((l) => l.x1 === l.x2);

		it(`dessine ${nBars} barre(s) horizontale(s) de la première à la dernière branche`, () => {
			expect(horizontal).toHaveLength(nBars);
			for (const bar of horizontal) {
				expect(bar.x1).toBe(310);
				expect(bar.x2).toBe(490);
			}
			if (nBars === 2) {
				expect(Math.abs(horizontal[0].y1 - horizontal[1].y1)).toBe(4);
			}
		});

		it("dessine une antenne du pivot à x + pivotPosition et une par branche", () => {
			expect(vertical.map((l) => l.x1).sort((a, b) => a - b)).toEqual([
				310, 360, 490,
			]);
			const pivotAntenna = vertical.find((l) => l.x1 === 360)!;
			const barY = horizontal[0].y1 + (nBars === 2 ? 2 : 0);
			const pivotHandleY = side === "start" ? 100 : 130;
			const branchHandleY = side === "start" ? 130 : 100;
			expect([pivotAntenna.y1, pivotAntenna.y2]).toEqual([pivotHandleY, barY]);
			const branchAntenna = vertical.find((l) => l.x1 === 310)!;
			expect([branchAntenna.y1, branchAntenna.y2]).toEqual([
				branchHandleY,
				barY,
			]);
		});
	});
});
