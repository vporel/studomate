import Variable, { VariableZone } from "@/schemas/variable/variable.schema";
import { JsPdfExporter } from "./jspdf.pdf-exporter";
import { PdfExportSection } from "./pdf-exporter";
import { PdfTableModel } from "./pdf-table";

export interface VariablesTablePdfLabels {
	mnemonic: string;
	type: string;
	address: string;
	comment: string;
}

/** Largeurs de colonnes (mm) pour une page A4 paysage, marges 15 mm (267 mm utiles). */
const COLUMN_WIDTHS = { mnemonic: 50, type: 22, address: 30, comment: 165 };

export function buildVariablesTableModel(
	variables: Variable[],
	labels: VariablesTablePdfLabels,
): PdfTableModel {
	const sorted = [...variables].sort((a, b) =>
		a.mnemonic.localeCompare(b.mnemonic),
	);
	return {
		columns: [
			{ header: labels.mnemonic, width: COLUMN_WIDTHS.mnemonic },
			{ header: labels.type, width: COLUMN_WIDTHS.type },
			{ header: labels.address, width: COLUMN_WIDTHS.address },
			{ header: labels.comment, width: COLUMN_WIDTHS.comment },
		],
		rows: sorted.map((v) => [
			v.mnemonic,
			v.type,
			v.address ?? "",
			v.comment ?? "",
		]),
	};
}

/**
 * Section « table des variables » pour l'export PDF. Réutilisée telle quelle par l'export d'un
 * projet complet (page dédiée après les programmes) et par l'export d'une seule page de variables.
 */
export function buildVariablesTableSection(
	title: string,
	variables: Variable[],
	labels: VariablesTablePdfLabels,
): PdfExportSection {
	return {
		title,
		orientation: "landscape",
		table: buildVariablesTableModel(variables, labels),
	};
}

/** Groupes de variables, calqués sur les pages entrées / sorties / mémoires. */
export type VariableGroupKey = "input" | "output" | "memory";

export const VARIABLE_GROUP_KEYS: VariableGroupKey[] = [
	"input",
	"output",
	"memory",
];

const GROUP_ZONES: Record<VariableGroupKey, VariableZone[]> = {
	input: ["logic-input", "analog-input"],
	output: ["logic-output", "analog-output"],
	memory: ["memory"],
};

export interface ProjectVariablesPdfLabels {
	columns: VariablesTablePdfLabels;
	groups: Record<VariableGroupKey, string>;
}

/**
 * Section de table pour un groupe de variables. Les variables exposées de blocs (`ownerBlock`)
 * et les variables système sont exclues — ces dernières ne sont de toute façon pas dans
 * `project.variables`.
 */
export function buildVariableGroupSection(
	key: VariableGroupKey,
	variables: Variable[],
	title: string,
	columns: VariablesTablePdfLabels,
): PdfExportSection {
	const zones = GROUP_ZONES[key];
	const group = variables.filter(
		(v) => zones.includes(v.zone) && !v.ownerBlock,
	);
	return buildVariablesTableSection(title, group, columns);
}

/** Une section par groupe non vide (entrées, sorties, mémoires). */
export function buildProjectVariablesSections(
	variables: Variable[],
	labels: ProjectVariablesPdfLabels,
): PdfExportSection[] {
	return VARIABLE_GROUP_KEYS.flatMap((key) => {
		const section = buildVariableGroupSection(
			key,
			variables,
			labels.groups[key],
			labels.columns,
		);
		return section.table!.rows.length === 0 ? [] : [section];
	});
}

export async function exportVariablesTablePdf(params: {
	filename: string;
	title: string;
	variables: Variable[];
	labels: VariablesTablePdfLabels;
}): Promise<void> {
	await new JsPdfExporter().export({
		filename: params.filename,
		sections: [
			buildVariablesTableSection(
				params.title,
				params.variables,
				params.labels,
			),
		],
	});
}
