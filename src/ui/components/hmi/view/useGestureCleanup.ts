"use client";

import { useEffect, useRef } from "react";

/**
 * Where a mouse gesture registers how to abandon itself (listeners removed from `window`, state
 * cleared). The registered function runs when the component unmounts, so a gesture left half done
 * does not write into a store or a component that is gone when the button is finally released.
 */
export default function useGestureCleanup() {
	const cleanupRef = useRef<(() => void) | null>(null);
	useEffect(() => () => cleanupRef.current?.(), []);
	return cleanupRef;
}
