"use client";

import { setStoredAppVersion } from "@/persistence/app-version.storage";
import {
	getStoredWhatsNewVersion,
	setStoredWhatsNewVersion,
} from "@/persistence/whats-new-version.storage";
import { APP_VERSION } from "@/app-info";
import checkAppVersion from "@/whats-new/app-version-check";
import { WHATS_NEW_VERSION } from "@/whats-new/whats-new-slides";
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

/** Brings the `localStorage` layout up to date so the version keys read below are the current ones. */
async function ensureLayout(): Promise<void> {
	const { ensureLocalStorageLayout } =
		await import("@/persistence/migrations/local-storage");
	ensureLocalStorageLayout();
}

/**
 * Records the application version and the news version on the first visit and, when the recorded one differs from
 * `WHATS_NEW_VERSION` (or is missing in a browser that already holds projects), updates it and
 * presents the news; the store also lets menus reopen it. Needs an intl provider holding the `whatsNew` messages.
 */
export default function WhatsNew() {
	const visible = useWhatsNewStore((state) => state.visible);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			await ensureLayout();
			if (cancelled) return;
			setStoredAppVersion(APP_VERSION);
			const stored = getStoredWhatsNewVersion();
			if (stored === WHATS_NEW_VERSION) return;
			const check = checkAppVersion(
				stored,
				WHATS_NEW_VERSION,
				stored === null && (await hasLocalProjects()),
			);
			if (cancelled) return;
			setStoredWhatsNewVersion(WHATS_NEW_VERSION);
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
