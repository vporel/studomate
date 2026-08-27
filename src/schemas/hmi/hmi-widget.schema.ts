import { createRandomId } from "@/ids";
import { nextAvailableName } from "@/lib/naming";
import { VariableType } from "@/schemas/variable/variable.schema";

export type HmiWidgetType =
	| "push-button"
	| "indicator"
	| "toggle-switch"
	| "numeric-display"
	| "gauge"
	| "numeric-input"
	| "rectangle"
	| "ellipse"
	| "text";

export type HmiWidgetSize = { width: number; height: number };
export type HmiWidgetPosition = { x: number; y: number };

/** Comportement d'un bouton poussoir (`push-button`) au clic, en simulation — voir `PushButton`. */
export type HmiPushButtonBehavior = "momentary" | "set" | "reset" | "toggle";

/** Orientation de la barre — gauge uniquement. */
export type HmiGaugeOrientation = "horizontal" | "vertical";

/** Alignement horizontal du texte — widget `text` uniquement. */
export type HmiTextAlign = "left" | "center" | "right";

/** Action déclenchable par un événement de widget (voir `HmiWidgetEvents`) — union discriminée
 * par `type`, une seule variante pour l'instant. */
export type HmiNavigateToPageAction = {
	type: "navigate-to-page";
	targetHmiPageId: string;
};
export type HmiAction = HmiNavigateToPageAction;

/** Liaisons événement -> actions déclenchées d'un widget, clé par nom d'événement propre à son
 * type (ex. `HmiPushButtonEventName`) — plusieurs actions peuvent être liées au même événement,
 * exécutées dans l'ordre (voir `executeHmiAction`). */
export type HmiWidgetEvents<TEventName extends string> = Partial<
	Record<TEventName, HmiAction[]>
>;

/** Seul événement exposé par un push-button pour l'instant — déclenché à l'appui, indépendamment
 * de `behavior`/`variableMnemonic` (un bouton peut déclencher des actions sans variable liée). */
export type HmiPushButtonEventName = "onPress";

/** Décalage de position piloté par des variables numériques, ajouté directement (sans mise à
 * l'échelle) aux coordonnées de base du widget — `x`/`y` indépendants l'un de l'autre. */
export type HmiPositionAnimation = {
	xVariableMnemonic?: string;
	yVariableMnemonic?: string;
};

/** Une ligne de la table d'animation de style : `value` est la valeur de variable qui déclenche
 * cette ligne par correspondance exacte (aucune ligne ne correspond -> valeurs statiques des
 * propriétés, voir `HmiStyleAnimation`), `properties` les valeurs prises par les propriétés
 * animables du widget pour cette valeur (voir `HMI_WIDGET_ANIMATABLE_STYLE_PROPS`). */
export type HmiStyleAnimationRow<TProps extends string> = {
	value: number;
	properties: Partial<Record<TProps, string>>;
};

/** Animation de style d'un widget : une seule variable (BOOL ou numérique) pilote en une fois
 * toutes les propriétés animables du type. */
export type HmiStyleAnimation<TProps extends string> = {
	variableMnemonic: string;
	rows: HmiStyleAnimationRow<TProps>[];
};

/** Bloc "Animations" d'un widget (voir `HmiWidgetAnimationsPanel`) — `TStyleProps` est `never`
 * pour un widget sans propriété de style animable (voir chaque `*Data`). */
export type HmiWidgetAnimations<TStyleProps extends string = never> = {
	position?: HmiPositionAnimation;
	style?: HmiStyleAnimation<TStyleProps>;
};

export type HmiWidgetDefinition = {
	/** Libellé affiché dans la palette/toolbar et son infobulle. */
	label: string;
	/** Libellé pré-rempli dans `data.label` à la création (voir `generateDefaultData`), pour ne
	 * jamais laisser le champ "Libellé" du panel de propriétés vide. Absent pour les widgets sans
	 * libellé (formes, texte — voir `HmiWidgetBaseData`). Distinct de `label`, qui nomme l'outil
	 * dans la palette et peut être plus long. */
	defaultLabel?: string;
	/** Dimensions par défaut à la création, en pixels. */
	defaultSize: HmiWidgetSize;
	/** Dimensions minimales, en pixels — bornes du redimensionnement. Absent pour un widget dont
	 * l'orientation peut varier (ex. gauge) : une taille minimale unique n'aurait de sens que pour
	 * une seule orientation. `useHmiWidgetResize` retombe alors sur un plancher générique. */
	minSize?: HmiWidgetSize;
	/** Ratio largeur/hauteur imposé au redimensionnement (ex. 1 pour un widget carré) —
	 * absent si le widget se redimensionne librement dans les deux dimensions. */
	aspectRatio?: number;
	/** Types de variables autorisés (pour le VariableSelector dans le panel de propriétés). */
	variableTypes: VariableType[];
};

/** Définition de chaque type de widget HMI — une seule source pour tout ce qui en dépend
 * (taille par défaut, taille minimale, types de variable compatibles, libellé). */
export const HMI_WIDGET_DEFINITIONS: Record<
	HmiWidgetType,
	HmiWidgetDefinition
> = {
	"push-button": {
		label: "Bouton poussoir",
		defaultLabel: "BP",
		defaultSize: { width: 90, height: 40 },
		minSize: { width: 80, height: 30 },
		variableTypes: ["BOOL"],
	},
	indicator: {
		label: "Voyant",
		defaultLabel: "Voyant",
		defaultSize: { width: 40, height: 40 },
		minSize: { width: 30, height: 30 },
		aspectRatio: 1,
		variableTypes: ["BOOL"],
	},
	"toggle-switch": {
		label: "Interrupteur",
		defaultLabel: "Interrupteur",
		defaultSize: { width: 90, height: 40 },
		minSize: { width: 80, height: 30 },
		variableTypes: ["BOOL"],
	},
	"numeric-display": {
		label: "Affichage numérique",
		defaultLabel: "Affichage",
		defaultSize: { width: 100, height: 40 },
		minSize: { width: 80, height: 30 },
		variableTypes: ["INT", "WORD", "DWORD", "REAL"],
	},
	gauge: {
		label: "Jauge",
		defaultLabel: "Jauge",
		defaultSize: { width: 120, height: 40 },
		variableTypes: ["INT", "WORD", "DWORD", "REAL"],
	},
	"numeric-input": {
		label: "Saisie numérique",
		defaultLabel: "Saisie",
		defaultSize: { width: 100, height: 40 },
		minSize: { width: 80, height: 30 },
		variableTypes: ["INT", "WORD", "DWORD", "REAL"],
	},
	rectangle: {
		label: "Rectangle",
		defaultSize: { width: 120, height: 80 },
		minSize: { width: 20, height: 20 },
		variableTypes: [],
	},
	ellipse: {
		label: "Ellipse",
		defaultSize: { width: 100, height: 70 },
		minSize: { width: 20, height: 20 },
		variableTypes: [],
	},
	text: {
		label: "Texte",
		defaultSize: { width: 120, height: 30 },
		minSize: { width: 20, height: 15 },
		variableTypes: [],
	},
};

/** Champs communs à tous les widgets — chaque type ajoute les siens (voir plus bas), plutôt
 * qu'un sac commun de champs optionnels valides seulement pour certains types. */
export type HmiWidgetBaseData = {
	/** Mnémonique de la variable liée, ou chaîne vide si non liée. */
	variableMnemonic: string;
	/** Libellé affiché sous le widget. */
	label: string;
};

export type PushButtonData = HmiWidgetBaseData & {
	/** Comportement au clic en simulation — défaut : `momentary`, voir `PushButton`. */
	behavior?: HmiPushButtonBehavior;
	events?: HmiWidgetEvents<HmiPushButtonEventName>;
	animations?: HmiWidgetAnimations;
};
/** Couleur du voyant allumé quand `IndicatorData.onColor` est absent (voir `Indicator`). */
export const DEFAULT_INDICATOR_ON_COLOR = "#4caf50";
/** Couleur du voyant éteint quand `IndicatorData.offColor` est absent (voir `Indicator`). */
export const DEFAULT_INDICATOR_OFF_COLOR = "#bdbdbd";

export type IndicatorData = HmiWidgetBaseData & {
	/** Couleur du voyant quand la variable liée est vraie — défaut `DEFAULT_INDICATOR_ON_COLOR`. */
	onColor?: string;
	/** Couleur du voyant quand la variable liée est fausse — défaut `DEFAULT_INDICATOR_OFF_COLOR`. */
	offColor?: string;
	animations?: HmiWidgetAnimations;
};
export type ToggleSwitchData = HmiWidgetBaseData & {
	animations?: HmiWidgetAnimations;
};
export type NumericDisplayData = HmiWidgetBaseData & {
	/** Unité affichée à côté de la valeur. */
	unit?: string;
	/** Nombre de décimales affichées. */
	decimalPlaces?: number;
	animations?: HmiWidgetAnimations;
};
export type GaugeData = HmiWidgetBaseData & {
	/** Valeur minimale de l'échelle. */
	min?: number;
	/** Valeur maximale de l'échelle. */
	max?: number;
	style?: {
		/** Défaut : `horizontal`, voir `Gauge`. */
		orientation?: HmiGaugeOrientation;
	};
	animations?: HmiWidgetAnimations;
};
export type NumericInputData = HmiWidgetBaseData & {
	/** Valeur minimale acceptée. */
	min?: number;
	/** Valeur maximale acceptée. */
	max?: number;
	animations?: HmiWidgetAnimations;
};

/** Propriétés de style animables d'un rectangle/ellipse — voir `HmiWidgetAnimations`. */
export type HmiShapeAnimatableProp = "fill" | "stroke";

/** Forme, purement visuelle — pas de variable "principale" comme les widgets ci-dessus (rien à
 * cliquer/écrire en simulation). N'étend donc pas `HmiWidgetBaseData`. */
export type RectangleData = {
	style: {
		fill: string;
		stroke: string;
		strokeWidth?: number;
		borderRadius?: number;
	};
	animations?: HmiWidgetAnimations<HmiShapeAnimatableProp>;
};
export type EllipseData = {
	style: {
		fill: string;
		stroke: string;
		strokeWidth?: number;
	};
	/** Contraint le redimensionnement à un ratio 1:1 (cercle) — voir `useHmiWidgetResize`. Un
	 * réglage par widget, pas par type (contrairement à `HMI_WIDGET_DEFINITIONS[type].aspectRatio`) :
	 * une ellipse peut librement devenir un cercle et inversement (voir `HmiWidgetPropertiesPanel`). */
	lockAspectRatio?: boolean;
	animations?: HmiWidgetAnimations<HmiShapeAnimatableProp>;
};
export type TextData = {
	text: string;
	style?: {
		fontSize?: number;
		color?: string;
		align?: HmiTextAlign;
	};
	animations?: HmiWidgetAnimations<"text">;
};

abstract class HmiWidgetBase<DataType> {
	id: string;
	abstract readonly type: HmiWidgetType;
	/** Identifie le widget dans le bloc "Objets" (voir `HmiObjectsPanel`) — unique au sein de sa
	 * page HMI, pas du projet. Généré à la création (voir `HmiWidget.nextName`), modifiable
	 * ensuite depuis le panel de propriétés. */
	name: string;
	position: HmiWidgetPosition;
	size: HmiWidgetSize;
	/** Ordre d'empilement dans le canvas — 0 pour le widget le plus en arrière, croissant vers
	 * l'avant-plan. Voir `HmiWidget.nextStackOrder` (ajout) et `HmiStoreState.bringForward` /
	 * `sendBackward` / `bringToFront` / `sendToBack` (réordonnancement). Décalé de
	 * `HMI_WIDGET_ZINDEX_OFFSET` à l'affichage (voir `constants.ts`), pas ici : ce décalage ne
	 * concerne que le rendu, pas la donnée persistée. */
	stackOrder: number;
	data: DataType;

	constructor(
		id: string,
		name: string,
		position: HmiWidgetPosition,
		size: HmiWidgetSize,
		stackOrder: number,
		data: DataType,
	) {
		this.id = id;
		this.name = name;
		this.position = position;
		this.size = size;
		this.stackOrder = stackOrder;
		this.data = data;
	}

	copy(): this {
		const Ctor = this.constructor as new (
			id: string,
			name: string,
			position: HmiWidgetPosition,
			size: HmiWidgetSize,
			stackOrder: number,
			data: DataType,
		) => this;
		return new Ctor(
			this.id,
			this.name,
			{ ...this.position },
			{ ...this.size },
			this.stackOrder,
			{ ...this.data },
		);
	}
}

class PushButtonWidget extends HmiWidgetBase<PushButtonData> {
	readonly type = "push-button" as const;
}
class IndicatorWidget extends HmiWidgetBase<IndicatorData> {
	readonly type = "indicator" as const;
}
class ToggleSwitchWidget extends HmiWidgetBase<ToggleSwitchData> {
	readonly type = "toggle-switch" as const;
}
class NumericDisplayWidget extends HmiWidgetBase<NumericDisplayData> {
	readonly type = "numeric-display" as const;
}
class GaugeWidget extends HmiWidgetBase<GaugeData> {
	readonly type = "gauge" as const;
}
class NumericInputWidget extends HmiWidgetBase<NumericInputData> {
	readonly type = "numeric-input" as const;
}
class RectangleWidget extends HmiWidgetBase<RectangleData> {
	readonly type = "rectangle" as const;
}
class EllipseWidget extends HmiWidgetBase<EllipseData> {
	readonly type = "ellipse" as const;
}
class TextWidget extends HmiWidgetBase<TextData> {
	readonly type = "text" as const;
}

/** Widget posé sur une page HMI — union discriminée par `type` : chaque membre ne porte que les
 * champs de `data` valides pour son type (voir `PushButtonData`, `GaugeData`...). Un
 * `widget.type === "gauge"` rétrécit `widget.data` en `GaugeData`, comme `BlockElement`/`BlockData`
 * côté Ladder. */
export type HmiWidget =
	| PushButtonWidget
	| IndicatorWidget
	| ToggleSwitchWidget
	| NumericDisplayWidget
	| GaugeWidget
	| NumericInputWidget
	| RectangleWidget
	| EllipseWidget
	| TextWidget;

/** Union de tous les `data` possibles — pour les rares points génériques qui manipulent un widget
 * de type inconnu à la compilation (voir `createInstance`, `HmiWidgetItem`). */
export type HmiWidgetData = HmiWidget["data"];

function generateDefaultData(type: HmiWidgetType): HmiWidgetData {
	const label = HMI_WIDGET_DEFINITIONS[type].defaultLabel ?? "";
	switch (type) {
		case "push-button":
			return { variableMnemonic: "", label, behavior: "momentary" };
		case "gauge":
			return {
				variableMnemonic: "",
				label,
				min: 0,
				max: 100,
				style: { orientation: "horizontal" },
			};
		case "numeric-input":
			return { variableMnemonic: "", label, min: 0, max: 100 };
		case "numeric-display":
			return { variableMnemonic: "", label, unit: "", decimalPlaces: 0 };
		case "indicator":
			return {
				variableMnemonic: "",
				label,
				onColor: DEFAULT_INDICATOR_ON_COLOR,
				offColor: DEFAULT_INDICATOR_OFF_COLOR,
			};
		case "toggle-switch":
			return { variableMnemonic: "", label };
		case "rectangle":
			return {
				style: {
					fill: "#e0e0e0",
					stroke: "#555555",
					strokeWidth: 2,
					borderRadius: 0,
				},
			};
		case "ellipse":
			return {
				style: { fill: "#e0e0e0", stroke: "#555555", strokeWidth: 2 },
				lockAspectRatio: false,
			};
		case "text":
			return {
				text: "Texte",
				style: { fontSize: 14, color: "#333333", align: "center" },
			};
	}
}

/** Instancie un widget par son type — dispatch générique utilisé par la création (toolbar), le
 * copier/coller et le rejeu des commandes annuler/rétablir, qui ne connaissent le type qu'à
 * l'exécution (voir `WidgetAddCommand`, `HmiCopyCutPasteManager`). */
function createInstance(
	id: string,
	type: HmiWidgetType,
	name: string,
	position: HmiWidgetPosition,
	size: HmiWidgetSize,
	stackOrder: number,
	data: HmiWidgetData,
): HmiWidget {
	switch (type) {
		case "push-button":
			return new PushButtonWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as PushButtonData,
			);
		case "indicator":
			return new IndicatorWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as IndicatorData,
			);
		case "toggle-switch":
			return new ToggleSwitchWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as ToggleSwitchData,
			);
		case "numeric-display":
			return new NumericDisplayWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as NumericDisplayData,
			);
		case "gauge":
			return new GaugeWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as GaugeData,
			);
		case "numeric-input":
			return new NumericInputWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as NumericInputData,
			);
		case "rectangle":
			return new RectangleWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as RectangleData,
			);
		case "ellipse":
			return new EllipseWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as EllipseData,
			);
		case "text":
			return new TextWidget(
				id,
				name,
				position,
				size,
				stackOrder,
				data as TextData,
			);
	}
}

/**
 * @param sizeOverride Taille de départ à la place de `HMI_WIDGET_DEFINITIONS[type].defaultSize`
 * — utilisé quand la palette expose plusieurs outils pour un même type avec des tailles de
 * départ différentes (ex. "Ellipse"/"Cercle", voir `HMI_WIDGET_TOOLS`). Le widget reste ensuite
 * librement redimensionnable comme n'importe quel autre.
 * @param dataOverride Complète les données par défaut du type — même usage que `sizeOverride`
 * (ex. "Cercle" verrouille `lockAspectRatio` dès la création, voir `HMI_SHAPE_TOOLS`).
 * @param stackOrder Ordre d'empilement — absent : `0` (widget seul). L'appelant qui connaît les
 * autres widgets de la page (ex. `HmiStoreState.addWidget`) doit le calculer via
 * `HmiWidget.nextStackOrder` pour que le nouveau widget arrive au premier plan.
 * @param name Nom affiché dans le bloc "Objets" — absent : généré comme si la page ne contenait
 * aucun autre widget (voir `HmiWidget.nextName`). L'appelant qui connaît les autres widgets de la
 * page (ex. `HmiStoreState.addWidget`) doit le calculer lui-même pour garantir l'unicité.
 */
function create(
	type: HmiWidgetType,
	x: number,
	y: number,
	sizeOverride?: HmiWidgetSize,
	dataOverride?: Partial<HmiWidgetData>,
	stackOrder = 0,
	name?: string,
): HmiWidget {
	return createInstance(
		createRandomId(),
		type,
		name ?? nextName(type, []),
		{ x, y },
		{ ...(sizeOverride ?? HMI_WIDGET_DEFINITIONS[type].defaultSize) },
		stackOrder,
		{ ...generateDefaultData(type), ...dataOverride } as HmiWidgetData,
	);
}

/** Ordre d'empilement à donner au prochain widget ajouté à `widgets` — place le nouveau widget
 * au premier plan (voir `HmiWidgetBase.stackOrder`). */
function nextStackOrder(widgets: HmiWidget[]): number {
	return widgets.length === 0
		? 0
		: Math.max(...widgets.map((w) => w.stackOrder)) + 1;
}

/** Nom à donner au prochain widget de ce type ajouté à `widgets` — format "Label_N" (voir
 * `HMI_WIDGET_DEFINITIONS[type].label`), en partant de 1 et en avançant jusqu'à trouver un nom
 * absent des `widgets` fournis (unicité par page, pas par projet — voir `HmiWidgetBase.name`). */
function nextName(type: HmiWidgetType, widgets: HmiWidget[]): string {
	return nextAvailableName(
		HMI_WIDGET_DEFINITIONS[type].label,
		widgets.map((w) => w.name),
	);
}

// `size` n'existait pas avant l'ajout du redimensionnement des widgets : un projet sauvegardé
// avant cette fonctionnalité retombe sur la taille par défaut du type.
function createFromJSON(json: string): HmiWidget {
	const raw = JSON.parse(json);
	const type = raw.type as HmiWidgetType;
	return createInstance(
		raw.id,
		type,
		raw.name ?? HMI_WIDGET_DEFINITIONS[type].label,
		raw.position ?? { x: 0, y: 0 },
		raw.size ?? { ...HMI_WIDGET_DEFINITIONS[type].defaultSize },
		raw.stackOrder ?? 0,
		raw.data ?? { variableMnemonic: "", label: "" },
	);
}

/**
 * Ratio largeur/hauteur à respecter au redimensionnement (voir `useHmiWidgetResize`), ou
 * `undefined` si libre. Vient soit du type (`HMI_WIDGET_DEFINITIONS`, ex. `indicator` toujours
 * carré), soit du widget lui-même pour une ellipse (`EllipseData.lockAspectRatio`, ex. "Cercle" —
 * seul type dont le ratio est un choix de l'utilisateur, pas une contrainte du type).
 */
function getResizeAspectRatio(widget: HmiWidget): number | undefined {
	const { aspectRatio } = HMI_WIDGET_DEFINITIONS[widget.type];
	if (aspectRatio !== undefined) return aspectRatio;
	return widget.type === "ellipse" && widget.data.lockAspectRatio
		? 1
		: undefined;
}

export const HmiWidget = {
	create,
	createFromJSON,
	createInstance,
	getResizeAspectRatio,
	nextStackOrder,
	nextName,
};
