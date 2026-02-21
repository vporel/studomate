"use client";

import Variable from "@/schemas/variable/Variable.class";
import { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import EditInputCell from "./EditInputCell";

export default function useGridColumns(): GridColDef[] {
	return useMemo(
		() => [
			{
				field: "mnemonic",
				headerName: "Mnémonique",
				width: 250,
				hideable: false,
				editable: true,
				preProcessEditCellProps: (params) => {
					const errors = Variable.validateMnemonic(params.props.value);
					return { ...params.props, error: errors.length > 0 ? errors[0] : false };
				},
				renderEditCell: EditInputCell,
			},
			{ field: "direction", headerName: "Direction", width: 100, hideable: false, editable: false },
			{ field: "type", headerName: "Type", width: 100, hideable: false, editable: true },
			{
				field: "address",
				headerName: "Adresse",
				width: 100,
				hideable: false,
				editable: true,
				preProcessEditCellProps: (params) => {
					const errors = Variable.validateAddress(params.props.value);
					return { ...params.props, error: errors.length > 0 ? errors[0] : false };
				},
				renderEditCell: EditInputCell,
			},
			{ field: "comment", headerName: "Commentaire", flex: 1, hideable: false, editable: true },
		],
		[],
	);
}
