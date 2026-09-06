import { Dialect } from "@/expression-language/dialect.enum";
import {
	BLOCK_DEFINITIONS,
	resolvePortSpecs,
} from "@/schemas/ladder/block-definition";
import { BlockElement, getCompareBlockParams } from "@/schemas/ladder/block.schema";
import { LadderElement } from "@/schemas/ladder/element.schema";
import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import { identifierName } from "./expression-refs";
import { RawReference, ReferenceAccess } from "./cross-reference.types";

function blockName(element: BlockElement): string {
	const params = element.data.params as { name?: string };
	return typeof params.name === "string" ? params.name : "";
}

/**
 * Références portées par un bloc ladder. Piloté par `resolvePortSpecs` (source de vérité unique
 * des ports, variante compteur `IN`/`CD` + `R`/`LD` comprise) : chaque pinoche `kind: "parameter"`
 * dont la valeur brute est un mnémonique produit une référence (`input` → lecture, `output` →
 * écriture). Les opérandes IN1/IN2 d'un bloc `compare` ne sont pas des `BlockPortSpec` et sont
 * lus à part. Les variables exposées d'un bloc timer/compteur (`<Nom>.Q`, `.ET`…) sont écrites
 * par le bloc à chaque cycle.
 */
function blockReferences(
	element: BlockElement,
	ladder: Ladder,
	section: Section,
	dialect: Dialect,
): RawReference[] {
	const definition = BLOCK_DEFINITIONS[element.data.blockType];
	const params = element.data.params;
	const refs: RawReference[] = [];
	const base = {
		programId: ladder.id,
		programType: "ladder" as const,
		locationId: element.id,
		locationKind: "ladder-block-pin" as const,
	};
	const locationParams = (port: string) => ({
		sectionTitle: section.title,
		gridRow: element.position.row,
		blockType: element.data.blockType,
		blockName: blockName(element),
		port,
	});

	for (const spec of resolvePortSpecs(element.data)) {
		if (spec.kind !== "parameter") continue;
		const name = identifierName(definition.readParam(params, spec.suffix), dialect);
		if (!name) continue;
		refs.push({
			...base,
			variableName: name,
			access: spec.direction === "input" ? "read" : "write",
			locationParams: locationParams(spec.suffix),
		});
	}

	if (element.data.blockType === "compare") {
		const compareParams = getCompareBlockParams(element);
		for (const [port, raw] of [
			["IN1", compareParams?.in1],
			["IN2", compareParams?.in2],
		] as const) {
			const name = identifierName(raw ?? "", dialect);
			if (!name) continue;
			refs.push({
				...base,
				variableName: name,
				access: "read",
				locationParams: locationParams(port),
			});
		}
	}

	if (
		definition.portsAreExposedVariables &&
		definition.exposedVariables &&
		validateBlockName(blockName(element)).length === 0
	) {
		for (const variable of definition.exposedVariables(element.id, params)) {
			refs.push({
				...base,
				variableName: variable.mnemonic,
				access: "write",
				locationParams: locationParams(variable.mnemonic.split(".").pop() ?? ""),
			});
		}
	}

	return refs;
}

function elementReferences(
	element: LadderElement,
	ladder: Ladder,
	section: Section,
	dialect: Dialect,
): RawReference[] {
	const base = {
		programId: ladder.id,
		programType: "ladder" as const,
		locationId: element.id,
		locationParams: {
			sectionTitle: section.title,
			gridRow: element.position.row,
		},
	};

	if (element.type === "contact" && element.data.variable) {
		return [
			{
				...base,
				variableName: element.data.variable,
				access: "read" as ReferenceAccess,
				locationKind: "ladder-contact",
			},
		];
	}
	if (element.type === "coil" && element.data.variable) {
		return [
			{
				...base,
				variableName: element.data.variable,
				access: "write" as ReferenceAccess,
				locationKind: "ladder-coil",
			},
		];
	}
	if (element.type === "block") {
		return blockReferences(element, ladder, section, dialect);
	}
	return [];
}

/**
 * Toutes les références (lecture/écriture de variable) portées par un ladder — parcourt les
 * sections dans l'ordre. Ne lève jamais.
 */
export default function collectLadderReferences(
	ladder: Ladder,
	dialect: Dialect,
): RawReference[] {
	const refs: RawReference[] = [];
	for (const section of ladder.sections) {
		for (const element of section.elements) {
			refs.push(...elementReferences(element, ladder, section, dialect));
		}
	}
	return refs;
}
