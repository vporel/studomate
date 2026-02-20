"use client";

import { Box, BoxProps } from "@mui/material";
import { forwardRef, ReactNode } from "react";
import { useProjectStore } from "../projects/ProjectContext";

interface PageComponentProps extends BoxProps {
	pageId: string;
	children: ReactNode;
}

const Page = forwardRef<HTMLElement, PageComponentProps>(function Page({ children, pageId, ...props }, ref) {
	const activePageId = useProjectStore((state) => state.activePageId);
	const open = activePageId === pageId;

	return (
		<Box
			{...props}
			id={pageId}
			ref={ref}
			sx={{
				flex: 1,
				height: "100%",
				backgroundColor: "rgb(235, 235, 235)",
				...props.sx,
				display: open ? "flex" : "none",
			}}
		>
			{children}
		</Box>
	);
});

export default Page;
