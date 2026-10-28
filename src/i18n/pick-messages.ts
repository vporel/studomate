import type { Messages, NamespaceKeys, NestedKeyOf } from "next-intl";

export type MessagesNamespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

/**
 * Subset of `messages` restricted to the given namespaces (dotted paths such as
 * `"public.header"`), keeping their nesting so `useTranslations("public.header")` resolves
 * against the subset as it would against the full messages.
 */
export default function pickMessages(
	messages: Messages,
	namespaces: readonly MessagesNamespace[],
): Partial<Messages> {
	const picked: Record<string, unknown> = {};
	for (const namespace of namespaces) {
		const segments = namespace.split(".");
		let source: unknown = messages;
		for (const segment of segments)
			source = (source as Record<string, unknown> | undefined)?.[segment];
		if (source === undefined) continue;

		let target = picked;
		for (const segment of segments.slice(0, -1)) {
			target[segment] ??= {};
			target = target[segment] as Record<string, unknown>;
		}
		target[segments[segments.length - 1]] = source;
	}
	return picked as Partial<Messages>;
}
