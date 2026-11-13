/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { Position } from "@xyflow/react";
import GrafcetConnectionLine from "./GrafcetConnectionLine";

function pathOf(props: {
	from: [number, number];
	to: [number, number];
	fromHandle: { id: string; type: "source" | "target"; position: Position };
	toHandle?: { id: string } | null;
}) {
	const { container } = render(
		<svg>
			<GrafcetConnectionLine
				{...({
					fromX: props.from[0],
					fromY: props.from[1],
					toX: props.to[0],
					toY: props.to[1],
					fromHandle: props.fromHandle,
					toHandle: props.toHandle ?? null,
				} as any)}
			/>
		</svg>,
	);
	return container.querySelector("path")!.getAttribute("d");
}

const SOURCE_BOTTOM = {
	id: "source:successor",
	type: "source",
	position: Position.Bottom,
} as const;
const TARGET_TOP = {
	id: "target:predecessor",
	type: "target",
	position: Position.Top,
} as const;

describe("GrafcetConnectionLine", () => {
	it("trace droit depuis la poignée de source d'un élément vers un élément plus bas", () => {
		expect(
			pathOf({ from: [100, 50], to: [100, 200], fromHandle: SOURCE_BOTTOM }),
		).toBe("M 100,50 L 100,200");
	});

	it("trace droit depuis la poignée de cible d'un élément vers un élément plus haut", () => {
		expect(
			pathOf({ from: [100, 200], to: [100, 50], fromHandle: TARGET_TOP }),
		).toBe("M 100,200 L 100,50");
	});

	it("conserve la boucle de retour quand on part d'une poignée de source vers un élément plus haut", () => {
		const d = pathOf({
			from: [100, 200],
			to: [100, 50],
			fromHandle: SOURCE_BOTTOM,
		});

		expect(d).toContain("L 60,");
	});

	it("trace en Z, du côté du curseur, depuis la poignée de gauche d'une action", () => {
		expect(
			pathOf({
				from: [200, 100],
				to: [120, 60],
				fromHandle: {
					id: "target:predecessor",
					type: "target",
					position: Position.Left,
				},
			}),
		).toBe("M 200,100 L 160,100 L 160,60 L 120,60");
	});

	it("trace depuis la poignée d'action d'une étape avec la version horizontale", () => {
		expect(
			pathOf({
				from: [100, 100],
				to: [200, 60],
				fromHandle: {
					id: "source:action",
					type: "source",
					position: Position.Right,
				},
			}),
		).toBe("M 100,100 L 150,100 L 150,60 L 200,60");
	});

	it("trace depuis la poignée suivante d'une action avec la version horizontale", () => {
		expect(
			pathOf({
				from: [100, 100],
				to: [200, 60],
				fromHandle: {
					id: "source:next",
					type: "source",
					position: Position.Right,
				},
			}),
		).toBe("M 100,100 L 150,100 L 150,60 L 200,60");
	});
});
