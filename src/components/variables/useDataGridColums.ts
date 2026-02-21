"use client";

import Variable, { VariableZone } from "@/schemas/variable/Variable.class";
import { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useProjectStore } from "../projects/ProjectContext";
import EditInputCell from "./EditInputCell";

export default function useGridColumns(zones: VariableZone[]): GridColDef[] {
	const variablesManager = useProjectStore((state) => state.variablesManager);

	return useMemo(
		(): GridColDef[] => [
			{
				field: "mnemonic",
				headerName: "Mnémonique",
				width: 250,
				hideable: false,
				editable: true,
				preProcessEditCellProps: (params) => {
					const errors = Variable.validateMnemonic(params.props.value);
					const existingVariableId = variablesManager.existsByMnemonic(params.props.value);
					if (existingVariableId && existingVariableId !== params.id)
						errors.push("Ce mnémonique existe déjà");
					return { ...params.props, error: errors.length > 0 ? errors[0] : false };
				},
				renderEditCell: EditInputCell,
				valueParser: (value) => (value ? value.trim() : ""),
			},
			{
				field: "type",
				headerName: "Type",
				width: 100,
				hideable: false,
				editable: true,
				type: "singleSelect",
				valueOptions: Variable.getValidTypesForZones(zones).map((type) => ({
					value: type,
					label: type,
				})),
			},
			{
				field: "address",
				headerName: "Adresse",
				width: 100,
				hideable: false,
				editable: true,
				preProcessEditCellProps: (params) => {
					const errors = Variable.validateAddress(params.props.value);
					const existingVariableId = variablesManager.existsByAddress(params.props.value);
					if (existingVariableId && existingVariableId !== params.id)
						errors.push("Cette adresse existe déjà");
					return {
						...params.props,
						error: errors.length > 0 ? errors[0] : false,
					};
				},
				renderEditCell: EditInputCell,
				valueParser: (value) => (value ? value.trim().toUpperCase() : ""),
			},
			{
				field: "comment",
				headerName: "Commentaire",
				flex: 1,
				hideable: false,
				editable: true,
			},
		],
		[variablesManager, zones],
	);
}
