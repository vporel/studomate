/**
 * @jest-environment jsdom
 */
import type { Locale } from "@/i18n/config";
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import type { GrafcetNodeType } from "./grafcet-nodes-definitions";
import useLabelledGrafcetNodes from "./useLabelledGrafcetNodes";

const node = (id: string, number: number) =>
	({
		id,
		type: "step",
		data: { number },
		position: { x: 0, y: 0 },
	}) as unknown as GrafcetNodeType;

const render = (nodes: GrafcetNodeType[], locale: Locale = "fr") =>
	renderHook(({ nodes }) => useLabelledGrafcetNodes(nodes), {
		initialProps: { nodes },
		wrapper: i18nWrapper(locale),
	});

describe("useLabelledGrafcetNodes", () => {
	it("pose un libellé accessible dans la langue de l'interface", () => {
		expect(render([node("a", 3)]).result.current[0].ariaLabel).toBe("Étape 3");
		expect(render([node("a", 3)], "es").result.current[0].ariaLabel).toBe(
			"Etapa 3",
		);
	});

	it("garde le même objet pour un nœud que le store n'a pas remplacé", () => {
		const untouched = node("a", 1);
		const { result, rerender } = render([untouched, node("b", 2)]);
		const before = result.current;

		rerender({ nodes: [untouched, node("b", 42)] });

		expect(result.current[0]).toBe(before[0]);
		expect(result.current[1]).not.toBe(before[1]);
		expect(result.current[1].ariaLabel).toBe("Étape 42");
	});
});
