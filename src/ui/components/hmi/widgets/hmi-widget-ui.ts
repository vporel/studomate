import {
	DEFAULT_INDICATOR_OFF_COLOR,
	DEFAULT_INDICATOR_ON_COLOR,
	HmiPushButtonBehavior,
	HmiWidget,
	HmiWidgetSize,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { ComponentType } from "react";
import GaugeSymbol from "../toolbar/GaugeSymbol";
import NumericInputSymbol from "../toolbar/NumericInputSymbol";
import Ellipse from "./Ellipse";
import Gauge from "./Gauge";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import Indicator from "./Indicator";
import NumericDisplay from "./NumericDisplay";
import NumericInput from "./NumericInput";
import PushButton from "./PushButton";
import Rectangle from "./Rectangle";
import Text from "./Text";
import ToggleSwitch from "./ToggleSwitch";

/** `data` du membre de l'union `HmiWidget` correspondant à `T`. */
type WidgetData<T extends HmiWidgetType> = Extract<
	HmiWidget,
	{ type: T }
>["data"];

/** Descripteur d'un champ spécifique du panneau Propriétés (voir `HmiWidgetPropertyFields`). Le
 * câblage vers `data` passe par `get`/`set` typés sur le `*Data` du widget — pas de chemin string,
 * TS casse sur un mauvais champ. */
export type HmiWidgetPropertyField<D> =
	| {
			kind: "text";
			label: string;
			multiline?: boolean;
			get: (data: D) => string;
			set: (data: D, value: string) => D;
	  }
	| {
			kind: "color";
			label: string;
			get: (data: D) => string;
			set: (data: D, value: string) => D;
	  }
	| {
			kind: "number";
			label: string;
			min?: number;
			max?: number;
			get: (data: D) => number;
			set: (data: D, value: number) => D;
	  }
	| {
			kind: "select";
			label: string;
			options: { value: string; label: string }[];
			get: (data: D) => string;
			set: (data: D, value: string) => D;
			/** Patch supplémentaire du widget appliqué en même temps que `set` — échappatoire pour
			 * les rares champs à effet de bord (ex. l'orientation de la jauge échange largeur/hauteur). */
			widgetPatch?: (
				widget: HmiWidget,
				value: string,
			) => { size?: HmiWidgetSize };
	  }
	| {
			kind: "checkbox";
			label: string;
			get: (data: D) => boolean;
			set: (data: D, value: boolean) => D;
	  };

/** Propriété de style animable d'un widget (voir `HmiWidgetAnimationsPane`) — `staticValue` lit la
 * valeur statique courante dans `data` (valeur de départ d'une nouvelle ligne de la table). */
export type HmiAnimatableStyleProp<D> = {
	name: string;
	label: string;
	inputType: "color" | "text";
	staticValue: (data: D) => string;
};

/** Métadonnées d'affichage de chaque type de widget — pendant UI de `HMI_WIDGET_DEFINITIONS`
 * (domaine). Ajouter un widget = une entrée ici (composant + aperçu + descripteurs de champs). */
export type HmiWidgetUi<T extends HmiWidgetType = HmiWidgetType> = {
	component: ComponentType<HmiWidgetComponentProps<any>>;
	/** Symbole d'aperçu compact si le rendu réel est illisible en miniature (ex. jauge, saisie). */
	toolSymbol?: ComponentType;
	/** Largeur d'aperçu dans la palette, en px. */
	previewWidth: number;
	/** Valeur de démo passée au rendu d'aperçu (ex. jauge à 30 %). */
	previewValue: boolean | number;
	/** Ordre d'apparition dans son groupe de palette (voir `HMI_WIDGET_TOOLS`). */
	paletteOrder: number;
	/** Phrase du manuel utilisateur pour ce widget (voir `HmiSection`). */
	manualDescription: string;
	animatableStyleProps: HmiAnimatableStyleProp<WidgetData<T>>[];
	events: { name: string; label: string }[];
	propertyFields: HmiWidgetPropertyField<WidgetData<T>>[];
};

const PUSH_BUTTON_BEHAVIORS: { value: HmiPushButtonBehavior; label: string }[] =
	[
		{ value: "momentary", label: "Impulsionnel (maintien momentané)" },
		{ value: "set", label: "SET (mise à 1)" },
		{ value: "reset", label: "RESET (mise à 0)" },
		{ value: "toggle", label: "Bascule (inversion)" },
	];

export const HMI_WIDGET_UI: { [T in HmiWidgetType]: HmiWidgetUi<T> } = {
	"push-button": {
		component: PushButton,
		previewWidth: 46,
		previewValue: false,
		paletteOrder: 1,
		manualDescription:
			"Bouton poussoir — commande une variable BOOL. Comportements configurables : maintien momentané (la variable passe à 1 tant que le bouton est enfoncé), SET (force à 1), RESET (force à 0), bascule (inverse la valeur à chaque appui).",
		animatableStyleProps: [],
		events: [{ name: "onPress", label: "Bouton pressé" }],
		propertyFields: [
			{
				kind: "select",
				label: "Comportement",
				options: PUSH_BUTTON_BEHAVIORS,
				get: (data) => data.behavior ?? "momentary",
				set: (data, value) => ({
					...data,
					behavior: value as HmiPushButtonBehavior,
				}),
			},
		],
	},
	"toggle-switch": {
		component: ToggleSwitch,
		previewWidth: 40,
		previewValue: false,
		paletteOrder: 2,
		manualDescription: "Interrupteur — lit et inverse une variable BOOL au clic.",
		animatableStyleProps: [],
		events: [],
		propertyFields: [],
	},
	indicator: {
		component: Indicator,
		previewWidth: 24,
		previewValue: false,
		paletteOrder: 3,
		manualDescription:
			"Voyant — affiche l'état d'une variable BOOL (éteint = gris, allumé = vert).",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "Couleur (allumé)",
				get: (data) => data.onColor ?? DEFAULT_INDICATOR_ON_COLOR,
				set: (data, value) => ({ ...data, onColor: value }),
			},
			{
				kind: "color",
				label: "Couleur (éteint)",
				get: (data) => data.offColor ?? DEFAULT_INDICATOR_OFF_COLOR,
				set: (data, value) => ({ ...data, offColor: value }),
			},
		],
	},
	"numeric-display": {
		component: NumericDisplay,
		previewWidth: 50,
		previewValue: 0,
		paletteOrder: 4,
		manualDescription:
			"Affichage numérique — affiche la valeur d'une variable numérique. Options : unité (suffixe textuel) et nombre de décimales.",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "text",
				label: "Unité",
				get: (data) => data.unit ?? "",
				set: (data, value) => ({ ...data, unit: value }),
			},
			{
				kind: "number",
				label: "Décimales",
				min: 0,
				max: 6,
				get: (data) => data.decimalPlaces ?? 0,
				set: (data, value) => ({ ...data, decimalPlaces: value }),
			},
		],
	},
	gauge: {
		component: Gauge,
		toolSymbol: GaugeSymbol,
		previewWidth: 60,
		previewValue: 30,
		paletteOrder: 5,
		manualDescription:
			"Jauge — barre de progression liée à une variable numérique. Options : min, max et orientation (horizontal / vertical).",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "select",
				label: "Orientation",
				options: [
					{ value: "horizontal", label: "Horizontal" },
					{ value: "vertical", label: "Vertical" },
				],
				get: (data) => data.style?.orientation ?? "horizontal",
				set: (data, value) => ({
					...data,
					style: {
						...data.style,
						orientation: value as "horizontal" | "vertical",
					},
				}),
				// La taille stockée reste exprimée "comme si horizontal" : on échange largeur/hauteur
				// au changement d'orientation plutôt que de recalculer les bornes de redimensionnement
				// par orientation (voir `useHmiWidgetResize`, resté générique).
				widgetPatch: (widget) => ({
					size: { width: widget.size.height, height: widget.size.width },
				}),
			},
			{
				kind: "number",
				label: "Min",
				get: (data) => data.min ?? 0,
				set: (data, value) => ({ ...data, min: value }),
			},
			{
				kind: "number",
				label: "Max",
				get: (data) => data.max ?? 100,
				set: (data, value) => ({ ...data, max: value }),
			},
		],
	},
	"numeric-input": {
		component: NumericInput,
		toolSymbol: NumericInputSymbol,
		previewWidth: 50,
		previewValue: 0,
		paletteOrder: 6,
		manualDescription:
			"Saisie numérique — champ de saisie lié à une variable numérique. En simulation, saisir une valeur et valider par Entrée ou en cliquant ailleurs l'écrit dans la variable. Options : min et max.",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "number",
				label: "Min",
				get: (data) => data.min ?? 0,
				set: (data, value) => ({ ...data, min: value }),
			},
			{
				kind: "number",
				label: "Max",
				get: (data) => data.max ?? 100,
				set: (data, value) => ({ ...data, max: value }),
			},
		],
	},
	text: {
		component: Text,
		previewWidth: 50,
		previewValue: 0,
		paletteOrder: 1,
		manualDescription:
			"Texte — texte libre. Options : contenu, taille de police, couleur, alignement (gauche / centré / droite).",
		animatableStyleProps: [
			{
				name: "text",
				label: "Texte",
				inputType: "text",
				staticValue: (data) => data.text,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "text",
				label: "Texte",
				multiline: true,
				get: (data) => data.text,
				set: (data, value) => ({ ...data, text: value }),
			},
			{
				kind: "number",
				label: "Taille",
				min: 1,
				get: (data) => data.style?.fontSize ?? 14,
				set: (data, value) => ({
					...data,
					style: { ...data.style, fontSize: value },
				}),
			},
			{
				kind: "color",
				label: "Couleur",
				get: (data) => data.style?.color ?? "#333333",
				set: (data, value) => ({
					...data,
					style: { ...data.style, color: value },
				}),
			},
			{
				kind: "select",
				label: "Alignement",
				options: [
					{ value: "left", label: "Gauche" },
					{ value: "center", label: "Centré" },
					{ value: "right", label: "Droite" },
				],
				get: (data) => data.style?.align ?? "center",
				set: (data, value) => ({
					...data,
					style: {
						...data.style,
						align: value as "left" | "center" | "right",
					},
				}),
			},
		],
	},
	rectangle: {
		component: Rectangle,
		previewWidth: 40,
		previewValue: 0,
		paletteOrder: 2,
		manualDescription:
			"Rectangle — forme rectangulaire. Options : couleur de remplissage, couleur et épaisseur du contour, rayon des angles.",
		animatableStyleProps: [
			{
				name: "fill",
				label: "Remplissage",
				inputType: "color",
				staticValue: (data) => data.style.fill,
			},
			{
				name: "stroke",
				label: "Contour",
				inputType: "color",
				staticValue: (data) => data.style.stroke,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "Remplissage",
				get: (data) => data.style.fill,
				set: (data, value) => ({
					...data,
					style: { ...data.style, fill: value },
				}),
			},
			{
				kind: "color",
				label: "Contour",
				get: (data) => data.style.stroke,
				set: (data, value) => ({
					...data,
					style: { ...data.style, stroke: value },
				}),
			},
			{
				kind: "number",
				label: "Épaisseur du contour",
				min: 0,
				get: (data) => data.style.strokeWidth ?? 0,
				set: (data, value) => ({
					...data,
					style: { ...data.style, strokeWidth: value },
				}),
			},
			{
				kind: "number",
				label: "Rayon des angles",
				min: 0,
				get: (data) => data.style.borderRadius ?? 0,
				set: (data, value) => ({
					...data,
					style: { ...data.style, borderRadius: value },
				}),
			},
		],
	},
	ellipse: {
		component: Ellipse,
		previewWidth: 40,
		previewValue: 0,
		paletteOrder: 3,
		manualDescription:
			'Ellipse — forme ovale ou circulaire. Options : couleur de remplissage, couleur et épaisseur du contour. La case "Lier largeur et hauteur" (section Dimensions) fige le ratio courant.',
		animatableStyleProps: [
			{
				name: "fill",
				label: "Remplissage",
				inputType: "color",
				staticValue: (data) => data.style.fill,
			},
			{
				name: "stroke",
				label: "Contour",
				inputType: "color",
				staticValue: (data) => data.style.stroke,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "Remplissage",
				get: (data) => data.style.fill,
				set: (data, value) => ({
					...data,
					style: { ...data.style, fill: value },
				}),
			},
			{
				kind: "color",
				label: "Contour",
				get: (data) => data.style.stroke,
				set: (data, value) => ({
					...data,
					style: { ...data.style, stroke: value },
				}),
			},
			{
				kind: "number",
				label: "Épaisseur du contour",
				min: 0,
				get: (data) => data.style.strokeWidth ?? 0,
				set: (data, value) => ({
					...data,
					style: { ...data.style, strokeWidth: value },
				}),
			},
		],
	},
};
