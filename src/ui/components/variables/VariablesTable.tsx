"use client";

import { VariableType, VariableZone, ZONES_TO_TYPES } from "@/schemas/variable/variable.schema";
import { Box } from "@mui/material";
import {
	DataGrid,
	GridRowEditStopParams,
	GridRowId,
	GridRowSelectionModel,
	GridRowsProp,
} from "@mui/x-data-grid";
import { GridApiCommunity } from "@mui/x-data-grid/internals";
import { useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import GridToolBar from "./GridToolBar";
import useDataGridColumns from "./useDataGridColums";

function chooseZone(zones: VariableZone[], type: VariableType): VariableZone {
	for (const zone in ZONES_TO_TYPES) {
		if (zones.includes(zone as VariableZone) && ZONES_TO_TYPES[zone as VariableZone].includes(type)) {
			return zone as VariableZone;
		}
	}
	throw new Error(`No zone found for type ${type} in zones ${zones.join(", ")}`);
}

const VariablesTable = ({ zones }: { zones: VariableZone[] }) => {
	if (zones.length === 0) throw new Error("At least one zone must be provided");
	const variablesManager = useProjectStore((state) => state.variablesManager);
	const projectVariables = useProjectStore(useShallow((state) => state.project?.variables || []));

	const dataGridColumns = useDataGridColumns(zones);

	const dataGrdiRows: GridRowsProp = useMemo(() => {
		const rows = projectVariables
			.filter((v) => zones.includes(v.zone))
			.map((v) => ({
				id: v.id,
				mnemonic: v.mnemonic,
				type: v.type,
				address: v.address || "",
				comment: v.comment || "",
			}));
		//Add an empty row
		rows.push({
			id: "new-variable",
			mnemonic: "",
			type: "BOOL",
			address: "",
			comment: "",
		});
		return rows;
	}, [projectVariables, zones]);

	const apiRef = useRef<GridApiCommunity>(null);

	const onRowEditStop = useCallback(
		(params: GridRowEditStopParams) => {
			if (!apiRef.current) return;
			const oldValues = params.row;
			const updatedValues: Record<string, any> = {};
			Object.keys(params.row).forEach((field) => {
				const rowUpdatedValues = apiRef.current!.getRowWithUpdatedValues(params.id, field);
				if (!rowUpdatedValues) return;
				updatedValues[field] = rowUpdatedValues[field];
			});
			const { id, ...newData } = updatedValues;
			//Check if the row is the empty row
			if (oldValues.mnemonic === "") {
				variablesManager.addVariables([
					{ ...(newData as any), zone: chooseZone(zones, newData.type) },
				]);
			} else {
				variablesManager.updateVariable(id.toString(), {
					...newData,
					zone: chooseZone(zones, newData.type),
				});
			}
		},
		[variablesManager, zones],
	);

	const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
		type: "include",
		ids: new Set<GridRowId>([]),
	});

	return (
		<Box
			sx={{
				width: "100%",
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
			}}
		>
			<DataGrid
				apiRef={apiRef}
				columns={dataGridColumns}
				rows={dataGrdiRows}
				hideFooterPagination
				hideFooterSelectedRowCount
				rowHeight={35}
				editMode="row"
				onRowEditStop={onRowEditStop}
				checkboxSelection
				disableRowSelectionOnClick
				isRowSelectable={(params) => params.row.mnemonic && params.row.mnemonic.trim() !== ""}
				rowSelectionModel={rowSelectionModel}
				onRowSelectionModelChange={(rowSelectionModel) => setRowSelectionModel(rowSelectionModel)}
				showToolbar
				slots={{
					toolbar: () => <GridToolBar rowSelectionModel={rowSelectionModel} />,
				}}
			/>
		</Box>
	);
};

export default VariablesTable;
