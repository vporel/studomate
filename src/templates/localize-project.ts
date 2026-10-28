import type { Locale } from "@/i18n/config";
import { Dialect } from "@/expression-language/dialect.enum";
import type Project from "@/schemas/project/project.schema";
import TEMPLATE_MNEMONICS_EN from "./template-mnemonics.en";

/** Name a scene's suggested mnemonic takes in a project written in `locale`. */
export function localizeMnemonic(mnemonic: string, locale: Locale): string {
	return locale === "en"
		? (TEMPLATE_MNEMONICS_EN[mnemonic] ?? mnemonic)
		: mnemonic;
}

/**
 * Adapts a project built from a template to the requested locale: in English, renames the
 * French mnemonics of `TEMPLATE_MNEMONICS_EN` (except those in `keep`) and switches the
 * project to the English dialect. French projects are left as built.
 */
export default function localizeProject(
	project: Project,
	locale: Locale,
	{ keep = [] }: { keep?: readonly string[] } = {},
): void {
	if (locale !== "en") return;
	const renames = Object.fromEntries(
		Object.entries(TEMPLATE_MNEMONICS_EN).filter(
			([mnemonic]) => !keep.includes(mnemonic),
		),
	);
	project.renameMnemonics(renames);
	project.setDialect(Dialect.EN);
}
