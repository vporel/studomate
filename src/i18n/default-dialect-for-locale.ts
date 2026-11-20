import { Dialect } from "@/expression-language/dialect.enum";
import type { Locale } from "./config";

/**
 * Dialect suggested for a new project in `locale`: only French has its own keywords, the other
 * interface languages write expressions with the IEC 61131-3 (English) ones.
 */
export default function defaultDialectForLocale(locale: Locale): Dialect {
	return locale === "fr" ? Dialect.FR : Dialect.EN;
}
