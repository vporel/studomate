import { LOCALES, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import {
	HMI_WIDGET_DEFINITIONS,
	type HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { createTranslator } from "next-intl";
import localizedWidgetDefaults, {
	type HmiEditorTranslator,
} from "./localized-widget-defaults";

const translator = (locale: Locale) =>
	createTranslator({
		locale,
		messages: getMessages(locale),
		namespace: "hmiEditor",
	}) as unknown as HmiEditorTranslator;

const TYPES = Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[];

describe("localizedWidgetDefaults", () => {
	it("nomme le widget et pré-remplit son libellé dans la langue de l'interface", () => {
		expect(localizedWidgetDefaults("push-button", translator("en"))).toEqual({
			nameBase: "Push button",
			data: { label: "PB" },
		});
		expect(localizedWidgetDefaults("indicator", translator("es"))).toEqual({
			nameBase: "Indicador",
			data: { label: "Piloto" },
		});
	});

	it("pré-remplit le texte d'un widget texte", () => {
		expect(localizedWidgetDefaults("text", translator("es")).data).toEqual({
			text: "Texto",
		});
	});

	it("ne donne aucun texte à une forme", () => {
		expect(localizedWidgetDefaults("rectangle", translator("en")).data).toEqual(
			{},
		);
	});

	it.each(LOCALES)(
		"a un nom et, le cas échéant, un texte traduits pour chaque type (%s)",
		(locale) => {
			const t = translator(locale);
			for (const type of TYPES) {
				const { nameBase, data } = localizedWidgetDefaults(type, t);
				for (const value of [nameBase, ...Object.values(data)]) {
					expect(value).toBeTruthy();
					expect(value).not.toContain("hmiEditor");
				}
			}
		},
	);
});
