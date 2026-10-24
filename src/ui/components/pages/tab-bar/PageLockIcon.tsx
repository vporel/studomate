"use client";

import { useT } from "@/ui/i18n/useT";
import { isPageReadOnly } from "@/ui/stores/project/editability";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

/** A padlock on the tab of an editor page that cannot be modified at the moment. */
export default function PageLockIcon({ pageId }: { pageId: string }) {
	const t = useT("pages.tabBar");
	const readOnly = useProjectStore((state) => isPageReadOnly(state, pageId));
	if (!readOnly) return null;

	return (
		<LockOutlinedIcon
			titleAccess={t("readOnly")}
			sx={{ fontSize: "0.9rem", opacity: 0.7 }}
		/>
	);
}
