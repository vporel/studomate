import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type {
	CrossReference,
	Reference,
	ReferenceProgramType,
} from "@/project-analyser/cross-reference/cross-reference.types";
import Project from "@/schemas/project/project.schema";
import { createTranslator } from "next-intl";

/** Un emplacement de référence prêt à afficher : libellé localisé + cible de navigation. */
export type CrossReferenceLocation = {
	label: string;
	programId: string;
	programType: ReferenceProgramType;
	locationId: string;
};

/** Les références d'une variable, séparées lecteurs / écrivains. */
export type CrossReferenceRow = {
	variableName: string;
	readers: CrossReferenceLocation[];
	writers: CrossReferenceLocation[];
};

/**
 * Rend les `CrossReference[]` du collecteur (domaine, sans texte) en lignes affichables : résout
 * les noms de programmes et construit un libellé localisé par emplacement — une clé ICU par
 * `locationKind` dans `src/i18n/messages/{fr,en}/crossReference.json`. Même principe que
 * `formatAnalysisIssue`.
 */
export default class CrossReferenceMapper {
	static analyserToApp(
		crossReferences: CrossReference[],
		project: Project,
		locale: Locale = DEFAULT_LOCALE,
	): CrossReferenceRow[] {
		const t = createTranslator({
			locale,
			messages: getMessages(locale),
			namespace: "crossReference",
		});

		const programName = (
			programId: string,
			programType: ReferenceProgramType,
		): string => {
			const program =
				programType === "grafcet"
					? project.getGrafcet(programId)
					: programType === "ladder"
						? project.getLadder(programId)
						: project.getHmiPage(programId);
			return program?.name ?? t("unknownProgram");
		};

		const dynamicLabel = (prefix: string, value: string): string =>
			t(`${prefix}.${value}` as Parameters<typeof t>[0]);

		const toLocation = (reference: Reference): CrossReferenceLocation => {
			const blockLabel =
				(reference.locationParams.blockName as string) ||
				(reference.locationParams.blockType
					? dynamicLabel("blockType", String(reference.locationParams.blockType))
					: "");
			const widgetTypeLabel = reference.locationParams.widgetType
				? dynamicLabel("widgetType", String(reference.locationParams.widgetType))
				: "";
			return {
				label: t(`location.${reference.locationKind}`, {
					...reference.locationParams,
					programName: programName(reference.programId, reference.programType),
					blockLabel,
					widgetTypeLabel,
					stepNumber: reference.locationParams.stepNumber ?? "?",
				}),
				programId: reference.programId,
				programType: reference.programType,
				locationId: reference.locationId,
			};
		};

		return crossReferences.map(({ variableName, references }) => ({
			variableName,
			readers: references
				.filter((reference) => reference.access === "read")
				.map(toLocation),
			writers: references
				.filter((reference) => reference.access === "write")
				.map(toLocation),
		}));
	}
}
