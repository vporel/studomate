import { TextDecoder, TextEncoder } from "util"
import { deserialize, serialize } from "node:v8"

if (typeof globalThis.TextEncoder === "undefined") {
	globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
	globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

//jsdom's global scope doesn't expose Node's native structuredClone — but a real
//implementation is needed, not the JSON round-trip one this used to be: v8's own
//serialize/deserialize implement the same structured-clone algorithm, so Date/Map/Set/
//undefined survive correctly instead of being silently mangled.
if (typeof globalThis.structuredClone === "undefined") {
	globalThis.structuredClone = (value: unknown) => deserialize(serialize(value))
}

import "@testing-library/jest-dom"

//Langue d'interface fixée au français pour les tests (le code hors React lit `resolveUiLocale`,
//qui retomberait sinon sur la locale du navigateur jsdom/node « en-US ») : les assertions
//portent sur le texte français.
jest.mock("@/persistence/preferences.storage", () => {
	const actual = jest.requireActual("@/persistence/preferences.storage")
	return { ...actual, resolveUiLocale: () => "fr" }
})
