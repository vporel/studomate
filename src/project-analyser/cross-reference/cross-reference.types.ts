import { ProgramType } from "@/schemas/program/program.schema";

export type ReferenceAccess = "read" | "write";

/** Notation ou page portant une référence — les pages HMI ne sont pas des `Program`, d'où
 * l'élargissement local. */
export type ReferenceProgramType = ProgramType | "hmi";

/**
 * Nature de l'emplacement d'une référence — pilote la clé de message localisé côté
 * `src/bridge/cross-reference.mapper.ts`. Le collecteur ne produit aucun texte.
 */
export type ReferenceLocationKind =
	| "ladder-contact"
	| "ladder-coil"
	| "ladder-block-pin"
	| "grafcet-transition"
	| "grafcet-action-boolean"
	| "grafcet-action-assign"
	| "grafcet-step"
	| "hmi-widget-binding"
	| "hmi-widget-animation";

/** Un endroit précis qui lit ou écrit une variable, avec de quoi y naviguer. */
export type Reference = {
	access: ReferenceAccess;
	programId: string;
	programType: ReferenceProgramType;
	/** Id de l'élément éditable (contact/bobine/bloc ladder, transition/action/étape grafcet). */
	locationId: string;
	locationKind: ReferenceLocationKind;
	/** Données structurelles sans langue interpolées dans le libellé (`sectionTitle`, `port`,
	 * `stepNumber`, `blockName`, `blockType`, `gridRow`…). */
	locationParams: Record<string, string | number>;
};

/** Idem `Reference`, avec le nom de la variable concernée — forme plate rendue par les
 * collecteurs par notation avant regroupement. */
export type RawReference = Reference & { variableName: string };

/** Toutes les références d'une variable donnée. */
export type CrossReference = {
	variableName: string;
	references: Reference[];
};
