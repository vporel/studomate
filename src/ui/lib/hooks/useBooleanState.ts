'use client'

import { useCallback, useState } from "react"

export default function useBooleanState(initialValue: boolean): [value: boolean, set: () => void, reset: () => void]{
	const [state, setState] = useState<boolean>(initialValue)

	return [state, useCallback(() => setState(true), []), useCallback(() => setState(false), [])]
}