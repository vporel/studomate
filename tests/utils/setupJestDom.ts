import { TextDecoder, TextEncoder } from "util"

if (typeof globalThis.TextEncoder === "undefined") {
	globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
	globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

if (typeof globalThis.structuredClone === "undefined") {
	globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value))
}

import "@testing-library/jest-dom"
