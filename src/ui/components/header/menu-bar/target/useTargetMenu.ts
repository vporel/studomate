"use client";

import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useTargetMenu(): AppMenuType {
	const t = useT("menu.target");
	const {
		hasTarget,
		status,
		designing,
		boardMode,
		programPresent,
		boardInUse,
		uploading,
		hardwareLinkManager,
	} = useProjectStore(
		useShallow((state) => ({
			hasTarget: !!state.project?.hardwareTarget,
			status: state.hardwareLink.status,
			designing: state.mode === ProjectMode.DESIGN,
			boardMode: state.hardwareLink.boardMode,
			programPresent: state.hardwareLink.programPresent,
			boardInUse:
				state.mode === ProjectMode.SIMULATION &&
				state.simulationKind !== "virtual",
			uploading: state.hardwareUpload.phase === "uploading",
			hardwareLinkManager: state.hardwareLinkManager,
		})),
	);
	// Browser capabilities are read after mounting, to match the server-rendered markup.
	const [supported, setSupported] = useState(false);
	useEffect(() => setSupported(isWebSerialSupported()), []);

	return useMemo(() => {
		const available = hasTarget && supported;
		const linked = available && status === "linked";
		const busy = uploading || boardInUse;
		return {
			id: "target",
			label: t("title"),
			items: [
				[
					{
						label: t("upload"),
						disabled:
							!available || !designing || uploading || status === "connecting",
						onClick: () => void hardwareLinkManager.uploadProgram(),
					},
					{
						label: t("link"),
						disabled: !available || status !== "disconnected" || uploading,
						onClick: () => void hardwareLinkManager.link(),
					},
					{
						label: t("unlink"),
						disabled: !linked || busy,
						onClick: () => void hardwareLinkManager.unlink(),
					},
				],
				[
					{
						label: t("start"),
						disabled:
							!linked ||
							busy ||
							!programPresent ||
							boardMode === "program-running",
						onClick: () => void hardwareLinkManager.runProgram(),
					},
					{
						label: t("stop"),
						disabled: !linked || busy || boardMode !== "program-running",
						onClick: () => void hardwareLinkManager.stopProgram(),
					},
				],
			],
		};
	}, [
		hasTarget,
		supported,
		status,
		designing,
		boardMode,
		programPresent,
		boardInUse,
		uploading,
		hardwareLinkManager,
		t,
	]);
}
