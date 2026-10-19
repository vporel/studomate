"use client";

import requestPersistentStorage from "@/offline/storage-persist";
import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect } from "react";

const SW_URL = "/serwist/sw.js";

/** Registers the offline service worker (scope `/`) and asks for persistent storage. */
export default function OfflineProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	useEffect(() => {
		void requestPersistentStorage();
	}, []);

	return (
		<SerwistProvider
			swUrl={SW_URL}
			disable={process.env.NODE_ENV === "development"}
			cacheOnNavigation={false}
			reloadOnOnline={false}
		>
			{children}
		</SerwistProvider>
	);
}
