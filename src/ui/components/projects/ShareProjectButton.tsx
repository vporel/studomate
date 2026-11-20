"use client";

import PlatformShareIcon from "@/ui/components/icons/PlatformShareIcon";
import { useT } from "@/ui/i18n/useT";
import type { ShareSource } from "@/ui/stores/project/managers/sharing.manager";
import { Button, type ButtonProps } from "@mui/material";
import { useProjectStore } from "./ProjectContext";
import useCanShare from "./useCanShare";

/** Starts sharing the project. Renders nothing when the project cannot be shared. */
export default function ShareProjectButton({
	source,
	label,
	...buttonProps
}: {
	source: ShareSource;
	label?: string;
} & Omit<ButtonProps, "onClick" | "startIcon" | "children">) {
	const t = useT("chrome.share");
	const canShare = useCanShare();
	const sharingManager = useProjectStore((state) => state.sharingManager);
	if (!canShare) return null;
	return (
		<Button
			{...buttonProps}
			startIcon={<PlatformShareIcon fontSize="small" />}
			onClick={() => void sharingManager.shareProject(source)}
		>
			{label ?? t("label")}
		</Button>
	);
}
