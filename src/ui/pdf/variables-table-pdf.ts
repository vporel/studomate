import Variable, { VariableZone } from "@/schemas/variable/variable.schema";
import { JsPdfExporter } from "@/ui/lib/pdf/jspdf.pdf-exporter";
import { PdfExportSection } from "@/ui/lib/pdf/pdf-exporter";
import { PdfTableModel } from "@/ui/lib/pdf/pdf-table";
import {
	VARIABLES_PAGES,
	type VariableGroupKey,
} from "@/ui/stores/project/variables-pages";

export interface VariablesTablePdfLabels {
	mnemonic: string;
	type: string;
	address: string;
	declaredValue: string;
	comment: string;
}

/** Largeurs de colonnes (mm) pour une page A4 paysage, marges 15 mm (267 mm utiles). */
const COLUMN_WIDTHS = {
	mnemonic: 50,
	type: 22,
	address: 30,
	declaredValue: 60,
	comment: 165,
};

export type VariablesTableColumns = "address" | "declaredValue";

export function buildVariablesTableModel(
	variables: Variable[],
	labels: VariablesTablePdfLabels,
	columns: VariablesTableColumns,
): PdfTableModel {
	const sorted = [...variables].sort((a, b) =>
		a.mnemonic.localeCompare(b.mnemonic),
	);
	if (columns === "declaredValue") {
		return {
			columns: [
				{ header: labels.mnemonic, width: COLUMN_WIDTHS.mnemonic },
				{ header: labels.type, width: COLUMN_WIDTHS.type },
				{ header: labels.declaredValue, width: COLUMN_WIDTHS.declaredValue },
				{
					header: labels.comment,
					width:
						COLUMN_WIDTHS.comment +
						COLUMN_WIDTHS.address -
						COLUMN_WIDTHS.declaredValue,
				},
			],
			rows: sorted.map((v) => [
				v.mnemonic,
				v.type,
				v.value ?? "",
				v.comment ?? "",
			]),
		};
	}
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
	columns: VariablesTableColumns,
): PdfExportSection {
	return {
		title,
		orientation: "landscape",
		table: buildVariablesTableModel(variables, labels, columns),
	};
}

export const VARIABLE_GROUP_KEYS: VariableGroupKey[] = VARIABLES_PAGES.map(
	(page) => page.group,
);

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
	const page = VARIABLES_PAGES.find((p) => p.group === key)!;
	const zones: readonly VariableZone[] = page.zones;
	const group = variables.filter(
		(v) => zones.includes(v.zone) && !v.ownerBlock,
	);
	return buildVariablesTableSection(title, group, columns, page.columns);
}

/** Une section par groupe non vide (entrées, sorties, mémoires, constantes). */
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
	columns: VariablesTableColumns;
}): Promise<void> {
	await new JsPdfExporter().export({
		filename: params.filename,
		sections: [
			buildVariablesTableSection(
				params.title,
				params.variables,
				params.labels,
				params.columns,
			),
		],
	});
}
