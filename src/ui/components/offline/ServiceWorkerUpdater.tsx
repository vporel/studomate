"use client";

import { useProjectContext } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import reloadPage from "@/ui/lib/reload-page";
import { useSerwist } from "@serwist/turbopack/react";
import { useEffect } from "react";
import { toast } from "react-toastify";

const TOAST_ID = "sw-update";

/**
 * Offers to switch to a newly installed service worker. Only the tab where the user accepted
 * reloads, after its draft has been written: other open tabs keep their editing session. The
 * update waits while pending changes could not be put in a draft.
 */
export default function ServiceWorkerUpdater() {
	const t = useT("toasts");
	const { serwist } = useSerwist();
	const projectStore = useProjectContext();

	useEffect(() => {
		if (!serwist) return;
		let accepted = false;

		const onWaiting = () => {
			toast.info(t("updateAvailable"), {
				toastId: TOAST_ID,
				autoClose: false,
				closeOnClick: false,
				onClick: () => {
					const draftSafe =
						projectStore?.getState().lifecycleManager.flushDraft() ?? true;
					if (!draftSafe) {
						toast.warning(t("updateBlockedByUnsavedChanges"));
						return;
					}
					accepted = true;
					serwist.messageSkipWaiting();
				},
			});
		};
		const onControlling = () => {
			if (accepted) reloadPage();
		};

		serwist.addEventListener("waiting", onWaiting);
		serwist.addEventListener("controlling", onControlling);
		return () => {
			serwist.removeEventListener("waiting", onWaiting);
			serwist.removeEventListener("controlling", onControlling);
		};
	}, [serwist, projectStore, t]);

	return null;
}
