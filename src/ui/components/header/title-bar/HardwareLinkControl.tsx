"use client";

import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Button, Chip, CircularProgress, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";

/** Status badge and link button of the hardware target; absent for a purely virtual project. */
const HardwareLinkControl = () => {
	const t = useT("chrome.hardwareLink");
	const { modelId, status, hardwareLinkManager } = useProjectStore(
		useShallow((state) => ({
			modelId: state.project?.hardwareTarget?.modelId ?? null,
			status: state.hardwareLink.status,
			hardwareLinkManager: state.hardwareLinkManager,
		})),
	);
	// Browser capabilities are read after mounting, to match the server-rendered markup.
	const [supported, setSupported] = useState<boolean | null>(null);
	useEffect(() => setSupported(isWebSerialSupported()), []);

	if (!modelId || supported === null) return null;

	if (!supported) {
		return (
			<Tooltip title={t("unsupported")}>
				<span
					role="img"
					aria-label={t("unsupportedAria")}
					style={{ display: "inline-flex" }}
				>
					<WarningAmberRoundedIcon fontSize="small" color="warning" />
				</span>
			</Tooltip>
		);
	}

	const board = HardwareDeviceRegistry.get(modelId)?.label ?? modelId;

	return (
		<>
			{status === "linked" ? (
				<Chip size="small" color="success" label={t("linked", { board })} />
			) : status === "connecting" ? (
				<Chip
					size="small"
					variant="outlined"
					icon={<CircularProgress size={12} />}
					label={t("connecting")}
				/>
			) : (
				<Chip
					size="small"
					variant="outlined"
					color="warning"
					label={t("disconnected", { board })}
				/>
			)}
			{status === "linked" ? (
				<Button size="small" onClick={() => void hardwareLinkManager.unlink()}>
					{t("unlink")}
				</Button>
			) : (
				<Button
					size="small"
					disabled={status === "connecting"}
					onClick={() => void hardwareLinkManager.link()}
				>
					{t("link")}
				</Button>
			)}
		</>
	);
};

export default HardwareLinkControl;
