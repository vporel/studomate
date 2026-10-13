"use client";

import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SettingsInputComponentRoundedIcon from "@mui/icons-material/SettingsInputComponentRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	IconButton,
	Tooltip,
} from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { useShallow } from "zustand/shallow";

/** Icon button with a tooltip; the span lets the tooltip show on a disabled button. */
const ActionButton = ({
	title,
	disabled,
	onClick,
	children,
}: {
	title: string;
	disabled: boolean;
	onClick: () => void;
	children: ReactNode;
}) => (
	<Tooltip title={title}>
		<span style={{ display: "inline-flex" }}>
			<IconButton
				size="small"
				sx={{ p: "3px" }}
				aria-label={title}
				disabled={disabled}
				onClick={onClick}
			>
				{children}
			</IconButton>
		</span>
	</Tooltip>
);

/** Status badge and link button of the hardware target; absent for a purely virtual project. */
const HardwareLinkControl = () => {
	const t = useT("chrome.hardwareLink");
	const {
		modelId,
		status,
		flashing,
		designing,
		boardMode,
		programPresent,
		upload,
		hardwareLinkManager,
	} = useProjectStore(
		useShallow((state) => ({
			modelId: state.project?.hardwareTarget?.modelId ?? null,
			status: state.hardwareLink.status,
			flashing: state.hardwareFirmware.phase === "flashing",
			designing: state.mode === ProjectMode.DESIGN,
			boardMode: state.hardwareLink.boardMode,
			programPresent: state.hardwareLink.programPresent,
			upload: state.hardwareUpload,
			hardwareLinkManager: state.hardwareLinkManager,
		})),
	);
	const uploading = upload.phase === "uploading";
	const percent =
		upload.totalBytes > 0
			? Math.round((100 * upload.sentBytes) / upload.totalBytes)
			: 0;
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
		<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
			{uploading ? (
				<Chip
					size="small"
					variant="outlined"
					icon={<CircularProgress size={12} />}
					label={t("uploading", { percent })}
				/>
			) : status === "linked" && boardMode === "program-running" ? (
				<Chip size="small" color="info" label={t("running", { board })} />
			) : status === "linked" && boardMode === "program-stopped" ? (
				<Chip size="small" color="warning" label={t("stopped", { board })} />
			) : status === "linked" ? (
				<Chip size="small" color="success" label={t("linked", { board })} />
			) : status === "connecting" ? (
				<Chip
					size="small"
					variant="outlined"
					icon={<CircularProgress size={12} />}
					label={flashing ? t("flashing") : t("connecting")}
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
				<>
					{boardMode === "program-running" && (
						<ActionButton
							title={t("stop")}
							disabled={uploading}
							onClick={() => void hardwareLinkManager.stopProgram()}
						>
							<StopRoundedIcon fontSize="small" />
						</ActionButton>
					)}
					{boardMode !== "program-running" && programPresent && (
						<ActionButton
							title={t("start")}
							disabled={uploading}
							onClick={() => void hardwareLinkManager.runProgram()}
						>
							<PlayArrowRoundedIcon fontSize="small" />
						</ActionButton>
					)}
					{boardMode !== "remote-io" && (
						<ActionButton
							title={t("resume")}
							disabled={uploading}
							onClick={() => void hardwareLinkManager.resumeRemoteIo()}
						>
							<SettingsInputComponentRoundedIcon fontSize="small" />
						</ActionButton>
					)}
					<ActionButton
						title={t("upload")}
						disabled={!designing || uploading}
						onClick={() => void hardwareLinkManager.uploadProgram()}
					>
						<UploadRoundedIcon fontSize="small" />
					</ActionButton>
					<Button
						size="small"
						disabled={uploading}
						onClick={() => void hardwareLinkManager.unlink()}
					>
						{t("unlink")}
					</Button>
				</>
			) : (
				<Button
					size="small"
					disabled={status === "connecting"}
					onClick={() => void hardwareLinkManager.link()}
				>
					{t("link")}
				</Button>
			)}
		</Box>
	);
};

export default HardwareLinkControl;
