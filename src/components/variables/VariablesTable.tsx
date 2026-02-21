"use client";

import { VariableZone } from "@/schemas/variable/Variable.class";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { DataGrid, GridRowsProp } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import useDataGridColumns from "./useDataGridColums";

const StyledBox = styled("div")(({ theme }) => ({
	height: 400,
	width: "100%",
}));

const VariablesTable = ({ zones }: { zones: VariableZone[] }) => {
	const projectVariables = useProjectStore(useShallow((state) => state.project?.variables || []));
	const variables = useMemo(
		() => projectVariables.filter((v) => zones.includes(v.zone)),
		[projectVariables, zones],
	);

	const dataGridColumns = useDataGridColumns();

	const dataGrdiRows: GridRowsProp = useMemo(() => {
		return variables.map((v) => ({
			id: v.id,
			mnemonic: v.mnemonic,
			direction: v.direction,
			type: v.type,
			address: v.address || "",
			comment: v.comment || "",
		}));
	}, [variables]);

	return (
		<Box
			sx={{
				width: "100%",
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
				columns={dataGridColumns}
				rows={dataGrdiRows}
				hideFooterPagination
				hideFooterSelectedRowCount
				rowHeight={35}
				onCellEditStop={(params) => {
					console.log(params);
				}}
				localeText={{
					noRowsLabel: "Aucune variable",
					columnMenuSortAsc: "Trier par ordre croissant",
					columnMenuSortDesc: "Trier par ordre décroissant",
					columnMenuFilter: "Filtrer",
					columnMenuManageColumns: "Gérer les colonnes",
				}}
			/>
		</Box>
	);
};

export default VariablesTable;
