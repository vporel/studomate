"use client";

import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import { useEffect, useState } from "react";

/**
 * Whether the browser supports Web Serial; `null` until mounted. The capability is read after
 * mounting so that the first render matches the server-rendered markup.
 */
export default function useWebSerialSupported(): boolean | null {
	const [supported, setSupported] = useState<boolean | null>(null);
	useEffect(() => setSupported(isWebSerialSupported()), []);
	return supported;
}
