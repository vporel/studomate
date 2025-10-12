"use client";

import { Box, BoxProps } from "@mui/material";
import { forwardRef, ReactNode } from "react";
import { usePagesContext } from "./context/PagesContext";

interface PageComponentProps extends BoxProps {
	pageId: string;
	children: ReactNode;
}

const Page = forwardRef<HTMLElement, PageComponentProps>(function Page({ children, pageId, ...props }, ref) {
	const { activePageId } = usePagesContext();
	const open = activePageId === pageId;

	return (
		<Box
			{...props}
			id={pageId}
			ref={ref}
			sx={{
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
