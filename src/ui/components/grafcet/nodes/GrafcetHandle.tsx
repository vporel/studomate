"use client";

import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { ComponentProps } from "react";

type GrafcetHandleProps = ComponentProps<typeof HandleWithConnectionsLimit> & {
	color: string;
};

const GrafcetHandle = ({ color, style, ...props }: GrafcetHandleProps) => (
	<HandleWithConnectionsLimit
		{...props}
		style={{ ...style, borderColor: color, backgroundColor: color }}
	/>
);

export default GrafcetHandle;
