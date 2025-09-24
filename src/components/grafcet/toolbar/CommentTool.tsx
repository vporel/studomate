"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

const CommentTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool type="comment" disabled={disabled}>
			<Box
				style={{
					width: "85px",
					height: "40px",
					border: "1px dashed black",
					borderRadius: 5,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				C
			</Box>
		</GrafcetTool>
	);
};

export default CommentTool;
