"use client";

import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	IconButton,
	Tooltip,
	Typography,
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

/**
 * Actions on the board of the project (load the program, online link, start and stop its program)
 * and the state of the link, shown only while there is one. Absent for a purely virtual project.
 */
const HardwareLinkControl = () => {
	const t = useT("chrome.hardwareLink");
	const {
		modelId,
		status,
		flashing,
		designing,
		boardMode,
		programPresent,
		kind,
		mode,
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
			kind: state.simulationKind,
			mode: state.mode,
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
	// A mode of the menu uses the board: its program and pins are not left to the user meanwhile.
	const boardInUse = mode === ProjectMode.SIMULATION && kind !== "virtual";

	const badge = () => {
		if (uploading) {
			return (
				<Chip
					size="small"
					variant="outlined"
					icon={<CircularProgress size={12} />}
					label={t("uploading", { percent })}
				/>
			);
		}
		if (status === "connecting") {
			return (
				<Chip
					size="small"
					variant="outlined"
					icon={<CircularProgress size={12} />}
					label={flashing ? t("flashing") : t("connecting")}
				/>
			);
		}
		if (status !== "linked") return null;
		if (mode === ProjectMode.SIMULATION && kind === "observation") {
			return <Chip size="small" color="info" label={t("observing")} />;
		}
		switch (boardMode) {
			case "remote-io":
				return <Chip size="small" color="success" label={t("remoteIo")} />;
			case "program-running":
				return <Chip size="small" color="info" label={t("running")} />;
			case "program-stopped":
				return <Chip size="small" color="warning" label={t("stopped")} />;
			default:
				return <Chip size="small" color="success" label={t("online")} />;
		}
	};

	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
			<Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>
				{board}
			</Typography>
			{badge()}
			{boardMode === "program-running" && status === "linked" && (
				<ActionButton
					title={t("stop")}
					disabled={uploading || boardInUse}
					onClick={() => void hardwareLinkManager.stopProgram()}
				>
					<StopRoundedIcon fontSize="small" />
				</ActionButton>
			)}
			{boardMode !== "program-running" &&
				programPresent &&
				status === "linked" && (
					<ActionButton
						title={t("start")}
						disabled={uploading || boardInUse}
						onClick={() => void hardwareLinkManager.runProgram()}
					>
						<PlayArrowRoundedIcon fontSize="small" />
					</ActionButton>
				)}
			<ActionButton
				title={t("upload")}
				disabled={!designing || uploading || status === "connecting"}
				onClick={() => void hardwareLinkManager.uploadProgram()}
			>
				<FileDownloadRoundedIcon fontSize="small" />
			</ActionButton>
			{status === "linked" ? (
				<Button
					size="small"
					disabled={uploading || boardInUse}
					onClick={() => void hardwareLinkManager.unlink()}
				>
					{t("unlink")}
				</Button>
			) : (
				<Button
					size="small"
					disabled={status === "connecting" || uploading}
					onClick={() => void hardwareLinkManager.link()}
				>
					{t("link")}
				</Button>
			)}
		</Box>
	);
};

export default HardwareLinkControl;
