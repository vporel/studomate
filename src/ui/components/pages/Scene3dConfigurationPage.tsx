"use client";

import { listScenes, getSceneDescriptor } from "@/3d-scenes/scene.registry";
import { getCandidateVariables } from "@/3d-scenes/scene3d-wiring";
import { useT } from "@/ui/i18n/useT";
import { PageData } from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import {
	Box,
	Button,
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
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";
import { whiteFieldSx } from "./hardware/hardware-target-editor";

export const SCENE3D_CONFIGURATION_PAGE_ID = "scene3d-configuration";
export const SCENE3D_CONFIGURATION_PAGE_DATA: PageData = {
	id: SCENE3D_CONFIGURATION_PAGE_ID,
	type: "scene3d-configuration",
	title: "Configuration scène 3D",
};

const NO_SCENE = "none";
const NO_VARIABLE = "";

const Scene3dConfigurationPage = () => {
	const t = useT("pages.scene3d");
	const ts = useT("scene3d");
	const {
		scene,
		variables,
		designing,
		setScene3d,
		createMissingVariables,
		scene3dLinkManager,
	} = useProjectStore(
		useShallow((state) => ({
			scene: state.project?.scene3d ?? null,
			variables: state.project?.variables,
			designing: state.mode === ProjectMode.DESIGN,
			setScene3d: state.setScene3d,
			createMissingVariables: state.createMissingScene3dVariables,
			scene3dLinkManager: state.scene3dLinkManager,
		})),
	);
	const descriptor = scene ? getSceneDescriptor(scene.sceneId) : undefined;
	const allVariables = variables ?? [];
	const hasUnboundPoint =
		!!scene &&
		!!descriptor &&
		descriptor.points.some(
			(point) => !allVariables.some((v) => v.id === scene.bindings[point.id]),
		);

	return (
		<Page
			pageId={SCENE3D_CONFIGURATION_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start", overflowY: "auto" }}
		>
			<Box sx={{ padding: "2rem 1rem", width: 900, maxWidth: "100%" }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: 2,
					}}
				>
					<Typography variant="h2">{t("heading")}</Typography>
					{scene && (
						<Button
							variant="contained"
							startIcon={<ViewInArIcon />}
							onClick={() => scene3dLinkManager.open()}
						>
							{t("openScene")}
						</Button>
					)}
				</Box>
				<Typography sx={{ mt: 2, mb: 3 }} color="text.secondary">
					{t("intro")}
				</Typography>
				<TextField
					select
					label={t("scene")}
					size="small"
					sx={{ width: 320, ...whiteFieldSx }}
					slotProps={{ inputLabel: { shrink: true } }}
					value={scene?.sceneId ?? NO_SCENE}
					disabled={!designing}
					onChange={(e) =>
						setScene3d(
							e.target.value === NO_SCENE
								? null
								: { sceneId: e.target.value, bindings: {} },
						)
					}
					helperText={designing ? undefined : t("readOnlyInSimulation")}
				>
					<MenuItem value={NO_SCENE}>{t("sceneNone")}</MenuItem>
					{scene && !descriptor && (
						<MenuItem value={scene.sceneId} disabled>
							{scene.sceneId}
						</MenuItem>
					)}
					{listScenes().map((item) => (
						<MenuItem key={item.id} value={item.id}>
							{ts(item.labelKey as never)}
						</MenuItem>
					))}
				</TextField>

				{scene && !descriptor && (
					<Typography color="error" sx={{ mt: 3 }}>
						{t("unknownScene", { sceneId: scene.sceneId })}
					</Typography>
				)}

				{scene && descriptor && (
					<>
						<Typography sx={{ mt: 2 }} color="text.secondary">
							{ts(descriptor.descriptionKey as never)}
						</Typography>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 2,
								mt: 4,
								mb: 1,
							}}
						>
							<Typography variant="h4" sx={{ flexGrow: 1 }}>
								{t("pointsHeading")}
							</Typography>
							<Button
								variant="outlined"
								size="small"
								disabled={!designing || !hasUnboundPoint}
								onClick={createMissingVariables}
							>
								{t("createMissing")}
							</Button>
						</Box>
						<Typography color="text.secondary" sx={{ mb: 1 }}>
							{t("pointsIntro")}
						</Typography>
						<TableContainer sx={{ backgroundColor: "#fff" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>{t("columns.point")}</TableCell>
										<TableCell>{t("columns.kind")}</TableCell>
										<TableCell>{t("columns.variable")}</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{descriptor.points.map((point) => {
										const candidates = getCandidateVariables(
											point,
											allVariables,
										);
										const boundId = scene.bindings[point.id];
										const value = candidates.some((v) => v.id === boundId)
											? boundId
											: NO_VARIABLE;
										return (
											<TableRow
												key={point.id}
												data-testid={`scene-point-${point.id}`}
											>
												<TableCell>{ts(point.labelKey as never)}</TableCell>
												<TableCell>
													<Chip size="small" label={t(`kinds.${point.kind}`)} />
												</TableCell>
												<TableCell>
													<TextField
														select
														size="small"
														fullWidth
														sx={{ maxWidth: 260 }}
														value={value}
														disabled={!designing}
														slotProps={{
															select: {
																displayEmpty: true,
																SelectDisplayProps: {
																	"aria-label": t("variableAria", {
																		point: ts(point.labelKey as never),
																	}),
																},
															},
														}}
														onChange={(e) => {
															const bindings = { ...scene.bindings };
															if (e.target.value === NO_VARIABLE)
																delete bindings[point.id];
															else bindings[point.id] = e.target.value;
															setScene3d({ ...scene, bindings });
														}}
													>
														<MenuItem value={NO_VARIABLE}>-</MenuItem>
														{candidates.map((variable) => (
															<MenuItem key={variable.id} value={variable.id}>
																{variable.mnemonic}
															</MenuItem>
														))}
													</TextField>
												</TableCell>
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

export default Scene3dConfigurationPage;
