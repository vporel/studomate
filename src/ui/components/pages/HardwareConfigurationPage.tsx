"use client";

import type { PinCapability } from "@/hardware/hardware-device.descriptor";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import type { HardwareModelId } from "@/schemas/hardware/hardware-target.schema";
import { useT } from "@/ui/i18n/useT";
import { PageData } from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import {
	Box,
	Chip,
	MenuItem,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";
import getHardwareTargetEditor from "./hardware/hardware-target-editors";
import { pinLabel, whiteFieldSx } from "./hardware/hardware-target-editor";

export const HARDWARE_CONFIGURATION_PAGE_ID = "hardware-configuration";
export const HARDWARE_CONFIGURATION_PAGE_DATA: PageData = {
	id: HARDWARE_CONFIGURATION_PAGE_ID,
	type: "hardware-configuration",
	title: "Configuration matérielle",
};

const NO_TARGET = "none";
const HardwareConfigurationPage = () => {
	const t = useT("pages.hardware");
	const { target, variables, designing, setHardwareModel, setHardwareTarget } =
		useProjectStore(
			useShallow((state) => ({
				target: state.project?.hardwareTarget ?? null,
				variables: state.project?.variables,
				designing: state.mode === ProjectMode.DESIGN,
				setHardwareModel: state.setHardwareModel,
				setHardwareTarget: state.setHardwareTarget,
			})),
		);
	const device = target
		? HardwareDeviceRegistry.get(target.modelId)
		: undefined;
	const editor = target ? getHardwareTargetEditor(target.modelId) : undefined;

	const variablesByAddress = useMemo(() => {
		const byAddress = new Map<string, NonNullable<typeof variables>>();
		for (const variable of variables ?? []) {
			if (!variable.address) continue;
			byAddress.set(variable.address, [
				...(byAddress.get(variable.address) ?? []),
				variable,
			]);
		}
		return byAddress;
	}, [variables]);

	return (
		<Page
			pageId={HARDWARE_CONFIGURATION_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start", overflowY: "auto" }}
		>
			<Box sx={{ padding: "2rem 1rem", width: 900, maxWidth: "100%" }}>
				<Typography variant="h2">{t("heading")}</Typography>
				<Typography sx={{ mt: 2, mb: 3 }} color="text.secondary">
					{t("intro")}
				</Typography>
				<TextField
					select
					label={t("target")}
					size="small"
					sx={{ width: 320, ...whiteFieldSx }}
					slotProps={{ inputLabel: { shrink: true } }}
					value={target?.modelId ?? NO_TARGET}
					disabled={!designing}
					onChange={(e) =>
						setHardwareModel(
							e.target.value === NO_TARGET
								? null
								: (e.target.value as HardwareModelId),
						)
					}
					helperText={designing ? undefined : t("readOnlyInSimulation")}
				>
					<MenuItem value={NO_TARGET}>{t("targetNone")}</MenuItem>
					{target && !device && (
						<MenuItem value={target.modelId} disabled>
							{target.modelId}
						</MenuItem>
					)}
					{HardwareDeviceRegistry.list().map((descriptor) => (
						<MenuItem key={descriptor.modelId} value={descriptor.modelId}>
							{descriptor.label}
						</MenuItem>
					))}
				</TextField>

				{target && !device && (
					<Typography color="error" sx={{ mt: 3 }}>
						{t("unknownModel", { modelId: String(target.modelId) })}
					</Typography>
				)}

				{target && device && editor && (
					<>
						<Typography variant="h4" sx={{ mt: 4, mb: 1 }}>
							{t("pinsHeading")}
						</Typography>
						<Typography color="text.secondary" sx={{ mb: 1 }}>
							{t("pinsIntro")}
						</Typography>
						<editor.Intro />
						<TableContainer sx={{ backgroundColor: "#fff" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>{t("columns.pin")}</TableCell>
										<TableCell>{t("columns.capabilities")}</TableCell>
										<TableCell>{t("columns.variable")}</TableCell>
										<editor.Headers />
									</TableRow>
								</TableHead>
								<TableBody>
									{device.pins.map((pin) => {
										const bound = variablesByAddress.get(pin.address) ?? [];
										return (
											<TableRow
												key={pin.address}
												data-testid={`pin-row-${pin.address}`}
											>
												<TableCell>
													<strong>{pinLabel(pin.address)}</strong>{" "}
													<Typography
														component="span"
														variant="caption"
														color="text.secondary"
													>
														{pin.address}
													</Typography>
												</TableCell>
												<TableCell>
													{pin.reservedFor ? (
														<Typography variant="body2" color="text.secondary">
															{t("reserved")}
														</Typography>
													) : (
														pin.capabilities.map(
															(capability: PinCapability) => (
																<Chip
																	key={capability}
																	size="small"
																	label={t(`capabilities.${capability}`)}
																	sx={{ mr: 0.5 }}
																/>
															),
														)
													)}
												</TableCell>
												<TableCell>
													{bound.length > 0
														? bound
																.map((variable) => variable.mnemonic)
																.join(", ")
														: "-"}
												</TableCell>
												<editor.PinCells
													target={target}
													pin={pin}
													boundVariables={bound}
													designing={designing}
													onChange={setHardwareTarget}
												/>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</>
				)}
			</Box>
		</Page>
	);
};

export default HardwareConfigurationPage;
