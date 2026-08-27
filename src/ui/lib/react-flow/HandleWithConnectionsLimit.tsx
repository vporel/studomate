"use client";
import { Handle, HandleProps, useNodeConnections } from "@xyflow/react";
import React from "react";

const HandleWithConnectionsLimit = ({
	style,
	...props
}: HandleProps &
	Omit<React.HTMLAttributes<HTMLDivElement>, "id"> & { limit: number }) => {
	const connections = useNodeConnections({ handleType: props.type });

	const handleConnections = connections.filter(
		(c: any) => c[props.type + "Handle"] == props.id,
	);

	return (
		<Handle
			{...props}
			isConnectable={handleConnections.length < props.limit}
			style={{
				...style,
				borderWidth: "0",
				minWidth: "1px",
				width: "1px",
				minHeight: "1px",
				height: "1px",
			}}
		/>
	);
};

export default HandleWithConnectionsLimit;
