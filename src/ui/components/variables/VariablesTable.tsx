"use client";

import {
	VariableType,
	VariableZone,
	ZONES_TO_TYPES,
} from "@/schemas/variable/variable.schema";
import { Box } from "@mui/material";
import {
	DataGrid,
	GridRowEditStopParams,
	GridRowId,
	GridRowSelectionModel,
	GridRowsProp,
	GridValidRowModel,
} from "@mui/x-data-grid";
import { GridApiCommunity } from "@mui/x-data-grid/internals";
import { enUS, frFR } from "@mui/x-data-grid/locales";
import {
	MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/shallow";
import { createRandomId } from "@/ids";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import EMPTY_ARRAY from "@/ui/lib/empty";
import { useProjectStore } from "../projects/ProjectContext";
import GridToolBar from "./GridToolBar";
import VariableRowContextMenu, {
	VariableRowMenuTarget,
} from "./VariableRowContextMenu";
import useDataGridColumns from "./useDataGridColums";

function chooseZone(zones: VariableZone[], type: VariableType): VariableZone {
	for (const zone in ZONES_TO_TYPES) {
		if (
			zones.includes(zone as VariableZone) &&
			ZONES_TO_TYPES[zone as VariableZone].includes(type)
		) {
			return zone as VariableZone;
		}
	}
	throw new Error(
		`No zone found for type ${type} in zones ${zones.join(", ")}`,
	);
}

const VariablesTable = ({
	zones,
	pageTitle,
}: {
	zones: VariableZone[];
	pageTitle: string;
}) => {
	if (zones.length === 0) throw new Error("At least one zone must be provided");
	const variablesManager = useProjectStore((state) => state.variablesManager);
	const projectVariables = useProjectStore(
		useShallow((state) => state.project?.variables ?? EMPTY_ARRAY),
	);

	const dataGridColumns = useDataGridColumns(zones);
	const containerRef = useRef<HTMLDivElement>(null);
	const [contextMenu, setContextMenu] = useState<{
		visible: boolean;
		target: VariableRowMenuTarget | null;
		position: { x: number; y: number };
	}>({ visible: false, target: null, position: { x: 0, y: 0 } });
	const { locale } = useLocaleContext();
	const gridLocaleText = (locale === "fr" ? frFR : enUS).components.MuiDataGrid
		.defaultProps.localeText;

	const zoneVariables = useMemo(
		() =>
			projectVariables.filter(
				(v) => zones.includes(v.zone) && !v.ownerBlock,
			),
		[projectVariables, zones],
	);

	// Ordre d'affichage propre à ce composant : permet de garder une variable fraîchement
	// insérée juste sous celle d'où l'insertion est partie, même si son mnémonique la placerait
	// ailleurs dans un tri. Réinitialisé au démontage, écrasé par un tri d'en-tête de colonne.
	const [order, setOrder] = useState<string[]>([]);
	// Ligne brouillon : une seule à la fois, non persistée tant que son mnémonique est vide.
	const [draft, setDraft] = useState<{
		id: string;
		type: VariableType;
	} | null>(null);
	// Insertion en cours de persistance : `draftId` → mnémonique saisi, pour recoller la variable
	// réelle créée à la place du brouillon dans `order`.
	const pendingInsert = useRef<{ draftId: string; mnemonic: string } | null>(
		null,
	);

	const apiRef = useRef<GridApiCommunity>(null);

	useEffect(() => {
		const currentIds = zoneVariables.map((v) => v.id);
		const currentSet = new Set(currentIds);
		// Lu une seule fois ici : la mise à jour de `setOrder` doit rester pure (React double-invoque
		// les updaters en dev, muter la ref à l'intérieur perdrait la résolution).
		const pending = pendingInsert.current;
		const matched = pending
			? zoneVariables.find((v) => v.mnemonic === pending.mnemonic)
			: undefined;

		setOrder((prev) => {
			const kept = prev.filter(
				(id) => currentSet.has(id) || id.startsWith("draft-"),
			);
			const added = currentIds.filter((id) => !kept.includes(id));
			if (pending) {
				const draftIdx = kept.indexOf(pending.draftId);
				if (draftIdx >= 0 && matched) {
					const next = [...kept];
					next[draftIdx] = matched.id;
					return [...next, ...added.filter((id) => id !== matched.id)];
				}
			}
			if (added.length === 0 && kept.length === prev.length) return prev;
			return [...kept, ...added];
		});

		if (pending && matched) pendingInsert.current = null;
	}, [zoneVariables]);

	useEffect(() => {
		if (draft && !order.includes(draft.id)) setDraft(null);
	}, [draft, order]);

	// Passe la ligne brouillon en édition dès qu'elle est rendue.
	useEffect(() => {
		if (!draft) return;
		const id = draft.id;
		const frame = requestAnimationFrame(() => {
			try {
				apiRef.current?.startRowEditMode({ id, fieldToFocus: "mnemonic" });
			} catch {
				// la grille n'a pas encore la ligne ; un rendu suivant relancera l'édition
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [draft]);

	const insertVariableBelow = useCallback(
		(variableId: string) => {
			const variable = zoneVariables.find((v) => v.id === variableId);
			if (!variable) return;
			const draftId = `draft-${createRandomId()}`;
			setOrder((prev) => {
				const base = prev.length > 0 ? prev : zoneVariables.map((v) => v.id);
				const i = base.indexOf(variableId);
				const next = [...base];
				next.splice(i < 0 ? next.length : i + 1, 0, draftId);
				return next;
			});
			setDraft({ id: draftId, type: variable.type });
		},
		[zoneVariables],
	);

	const dataGrdiRows: GridRowsProp = useMemo(() => {
		const byId = new Map<string, GridValidRowModel>(
			zoneVariables.map((v) => [
				v.id,
				{
					id: v.id,
					mnemonic: v.mnemonic,
					type: v.type,
					address: v.address || "",
					comment: v.comment || "",
				},
			]),
		);
		const orderedIds =
			order.length > 0 ? order : zoneVariables.map((v) => v.id);
		const seen = new Set<string>();
		const rows: GridValidRowModel[] = [];
		for (const id of orderedIds) {
			if (seen.has(id)) continue;
			seen.add(id);
			if (draft && id === draft.id) {
				rows.push({
					id: draft.id,
					mnemonic: "",
					type: draft.type,
					address: "",
					comment: "",
				});
			} else if (byId.has(id)) {
				rows.push(byId.get(id)!);
			}
		}
		for (const v of zoneVariables) {
			if (!seen.has(v.id)) rows.push(byId.get(v.id)!);
		}
		//Add an empty row
		rows.push({
			id: "new-variable",
			mnemonic: "",
			type: "BOOL",
			address: "",
			comment: "",
		});
		return rows;
	}, [zoneVariables, order, draft]);

	const onRowEditStop = useCallback(
		(params: GridRowEditStopParams) => {
			if (!apiRef.current) return;
			const oldValues = params.row;
			const updatedValues: Record<string, any> = {};
			Object.keys(params.row).forEach((field) => {
				const rowUpdatedValues = apiRef.current!.getRowWithUpdatedValues(
					params.id,
					field,
				);
				if (!rowUpdatedValues) return;
				updatedValues[field] = rowUpdatedValues[field];
			});
			const { id, ...newData } = updatedValues;
			const isDraft = typeof id === "string" && id.startsWith("draft-");
			//Check if the row is an empty row (bottom add row or inserted draft)
			if (oldValues.mnemonic === "") {
				const mnemonic = (newData.mnemonic ?? "").trim();
				if (mnemonic !== "") {
					if (isDraft) {
						pendingInsert.current = { draftId: id, mnemonic };
					}
					variablesManager.addVariables([
						{ ...(newData as any), zone: chooseZone(zones, newData.type) },
					]);
				} else if (isDraft) {
					setOrder((prev) => prev.filter((x) => x !== id));
					setDraft(null);
				}
			} else {
				variablesManager.updateVariable(id.toString(), {
					...newData,
					zone: chooseZone(zones, newData.type),
				});
			}
		},
		[variablesManager, zones],
	);

	const [rowSelectionModel, setRowSelectionModel] =
		useState<GridRowSelectionModel>({
			type: "include",
			ids: new Set<GridRowId>([]),
		});

	const onRowContextMenu = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			const id = event.currentTarget.getAttribute("data-id");
			// La ligne d'ajout vide (`new-variable`) n'a pas de variable à cibler.
			if (!id || id === "new-variable" || !containerRef.current) return;
			const variable = projectVariables.find((v) => v.id === id);
			if (!variable) return;
			event.preventDefault();
			const rect = containerRef.current.getBoundingClientRect();
			setContextMenu({
				visible: true,
				target: { variableId: id, mnemonic: variable.mnemonic },
				position: {
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
				},
			});
		},
		[projectVariables],
	);

	const closeContextMenu = useCallback(
		() => setContextMenu((menu) => ({ ...menu, visible: false })),
		[],
	);

	const variableToReveal = useProjectStore((state) => state.variableToReveal);
	const setVariableToReveal = useProjectStore(
		(state) => state.setVariableToReveal,
	);
	const [revealedRowId, setRevealedRowId] = useState<GridRowId | null>(null);

	// Révélation demandée par `useGotoVariableDeclaration` : la table dont la zone contient la
	// variable fait défiler jusqu'à sa ligne, la sélectionne et la surligne, puis consomme le
	// signal. Les autres tables ouvertes l'ignorent.
	useEffect(() => {
		if (!variableToReveal) return;
		const target = projectVariables.find((v) => v.id === variableToReveal);
		if (!target || !zones.includes(target.zone)) return;
		setVariableToReveal(null);
		const rowIndex = dataGrdiRows.findIndex(
			(row) => row.id === variableToReveal,
		);
		if (rowIndex < 0) return;
		setRowSelectionModel({
			type: "include",
			ids: new Set<GridRowId>([variableToReveal]),
		});
		setRevealedRowId(variableToReveal);
		// `scrollToIndexes` couvre le cas d'une grille au scroll interne ; `scrollIntoView` sur la
		// ligne rendue couvre celui d'une grille sans hauteur bornée où c'est la page qui défile.
		apiRef.current?.scrollToIndexes({ rowIndex });
		const revealId = variableToReveal;
		requestAnimationFrame(() =>
			apiRef.current
				?.getRowElement(revealId)
				?.scrollIntoView?.({ block: "center" }),
		);
	}, [
		variableToReveal,
		projectVariables,
		zones,
		dataGrdiRows,
		setVariableToReveal,
	]);

	useEffect(() => {
		if (!revealedRowId) return;
		const timer = setTimeout(() => setRevealedRowId(null), 3000);
		return () => clearTimeout(timer);
	}, [revealedRowId]);

	return (
		<Box
			ref={containerRef}
			sx={{
				width: "100%",
				position: "relative",
				"& .MuiDataGrid-row--editing .MuiDataGrid-cell": {
					backgroundColor: "rgb(13, 71, 161, 0.1)",
				},
				"& .Mui-error": (theme) => ({
					backgroundColor: "rgb(126,10,15, 0.1)",
					color: "#750f0f",
					...theme.applyStyles("dark", {
						backgroundColor: "rgb(126,10,15, 0)",
						color: "#ff4343",
					}),
				}),
				"@keyframes variable-reveal-flash": {
					from: { backgroundColor: "rgba(13, 71, 161, 0.28)" },
					to: { backgroundColor: "rgba(13, 71, 161, 0)" },
				},
				"& .MuiDataGrid-row.row-revealed": {
					animation: "variable-reveal-flash 3s ease-out",
				},
			}}
		>
			<DataGrid
				apiRef={apiRef}
				localeText={gridLocaleText}
				columns={dataGridColumns}
				rows={dataGrdiRows}
				hideFooterPagination
				hideFooterSelectedRowCount
				rowHeight={35}
				editMode="row"
				onRowEditStop={onRowEditStop}
				checkboxSelection
				disableRowSelectionOnClick
				isRowSelectable={(params) =>
					params.row.mnemonic && params.row.mnemonic.trim() !== ""
				}
				getRowClassName={(params) =>
					params.id === revealedRowId ? "row-revealed" : ""
				}
				rowSelectionModel={rowSelectionModel}
				onRowSelectionModelChange={(rowSelectionModel) =>
					setRowSelectionModel(rowSelectionModel)
				}
				showToolbar
				slots={{
					toolbar: () => (
						<GridToolBar
							rowSelectionModel={rowSelectionModel}
							zoneVariables={zoneVariables}
							pageTitle={pageTitle}
						/>
					),
				}}
				slotProps={{ row: { onContextMenu: onRowContextMenu } }}
			/>
			{contextMenu.visible && (
				<VariableRowContextMenu
					visible
					target={contextMenu.target}
					position={contextMenu.position}
					onClose={closeContextMenu}
					onInsertBelow={(variableId) => {
						closeContextMenu();
						insertVariableBelow(variableId);
					}}
					parentWidth={window.innerWidth}
					parentHeight={window.innerHeight}
				/>
			)}
		</Box>
	);
};

export default VariablesTable;
