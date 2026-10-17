"use client";

import useWebSerialSupported from "@/ui/components/hardware/useWebSerialSupported";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { selectHardwareActions } from "@/ui/stores/project/hardware-actions.selector";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useTargetMenu(): AppMenuType {
	const t = useT("menu.target");
	const supported = useWebSerialSupported() === true;
	const {
		canUpload,
		canLink,
		canUnlink,
		canStart,
		canStop,
		hardwareLinkManager,
	} = useProjectStore(
		useShallow((state) => ({
			...selectHardwareActions(state, supported),
			hardwareLinkManager: state.hardwareLinkManager,
		})),
	);

	return useMemo(
		() => ({
			id: "target",
			label: t("title"),
			items: [
				[
					{
						label: t("upload"),
						disabled: !canUpload,
						onClick: () => void hardwareLinkManager.uploadProgram(),
					},
					{
						label: t("link"),
						disabled: !canLink,
						onClick: () => void hardwareLinkManager.link(),
					},
					{
						label: t("unlink"),
						disabled: !canUnlink,
						onClick: () => void hardwareLinkManager.unlink(),
					},
				],
				[
					{
						label: t("start"),
						disabled: !canStart,
						onClick: () => void hardwareLinkManager.runProgram(),
					},
					{
						label: t("stop"),
						disabled: !canStop,
						onClick: () => void hardwareLinkManager.stopProgram(),
					},
				],
			],
		}),
		[canUpload, canLink, canUnlink, canStart, canStop, hardwareLinkManager, t],
	);
}
