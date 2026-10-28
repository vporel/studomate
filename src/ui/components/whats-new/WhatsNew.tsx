"use client";

import { APP_VERSION } from "@/app-info";
import {
	getStoredAppVersion,
	setStoredAppVersion,
} from "@/persistence/app-version.storage";
import checkAppVersion from "@/whats-new/app-version-check";
import {
	whatsNewStore,
	useWhatsNewStore,
} from "@/ui/stores/whats-new/whats-new.store";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const WhatsNewModal = dynamic(() => import("./WhatsNewModal"), { ssr: false });

/** Whether this browser already holds projects; the repository stays out of the eager bundle. */
async function hasLocalProjects(): Promise<boolean> {
	const { default: LocalStorageProjectRepository } =
		await import("@/persistence/repositories/local-storage.project.repository");
	return new LocalStorageProjectRepository().hasProjects();
}

/**
 * Records the app version on the first visit and, when the recorded one differs from
 * `APP_VERSION` (or is missing in a browser that already holds projects), updates it and
 * presents the news; the store also lets menus reopen it. Needs an intl provider holding the `whatsNew` messages.
 */
export default function WhatsNew() {
	const visible = useWhatsNewStore((state) => state.visible);

	useEffect(() => {
		const stored = getStoredAppVersion();
		if (stored === APP_VERSION) return;
		let cancelled = false;
		void (async () => {
			const check = checkAppVersion(
				stored,
				APP_VERSION,
				stored === null && (await hasLocalProjects()),
			);
			if (cancelled) return;
			setStoredAppVersion(APP_VERSION);
			if (check === "changed") whatsNewStore.getState().open();
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return visible ? (
		<WhatsNewModal onClose={() => whatsNewStore.getState().close()} />
	) : null;
}
