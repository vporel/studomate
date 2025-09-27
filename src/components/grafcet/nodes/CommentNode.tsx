"use client";
import Comment, { CommentData } from "@/schemas/grafcet/Comment.class";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import React, { useEffect, type FC } from "react";

export type CommentNodeType = Node<CommentData> & { type: "comment" };

export type CommentNodeProps = NodeProps<CommentNodeType>;

const CommentNode: FC<CommentNodeProps> = ({ id, data, selected, width: nodeWidth, height: nodeHeight }) => {
	const th = useTheme();
	const { updateNodeData } = useReactFlow();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const [editing, setEditing] = React.useState(false);
	const borderColor = selected ? th.palette.primary.main : "black";

	const onTextChange = React.useCallback(
		(newText: string) => {
			updateNodeData(id, { ...data, text: newText });
		},
		[id, data, updateNodeData]
	);

	//Update the width and the height when the node is resized
	useEffect(() => {
		updateNodeData(id, () => {
			const dataToChange: Partial<CommentData> = {};
			if (nodeWidth != 0) dataToChange.width = nodeWidth;
			if (nodeHeight != 0) dataToChange.height = nodeHeight;
			return dataToChange;
		});
	}, [id, nodeWidth, nodeHeight, updateNodeData]);

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={Comment.defaultDimensions.width}
				minHeight={Comment.defaultDimensions.height}
			/>
			<Box
				className="grafcet-node comment-node"
				sx={{
					width: (nodeWidth != 0 ? nodeWidth : data.width) + "px",
					height: (nodeHeight != 0 ? nodeHeight : data.height) + "px",
					borderWidth: "1px",
					borderStyle: "dashed",
					borderColor: borderColor,
					borderRadius: "5px",
					backgroundColor: "white",
					padding: "5px",
					display: "flex",
					alignItems: "center",
					transition: "background .2s ease, borderColor .2s ease",
					"&:hover": {
						background: "#efefef",
					},
				}}
				onDoubleClick={() => {
					setEditing(true);
					textareaRef.current?.focus();
				}}
			>
				<textarea
					ref={textareaRef}
					className="node__input comment_node__textarea"
					value={data?.text}
					onChange={(e) => onTextChange(e.target.value)}
					rows={1}
					style={{
						width: "100%",
						border: "none",
						outline: "none",
						resize: "none",
						boxSizing: "border-box",
						overflow: "hidden",
						padding: "0",
						lineHeight: "1.2rem",
						pointerEvents: !editing ? "none" : "all",
						fontSize: "0.8rem",
					}}
					onBlur={() => setEditing(false)}
				/>
			</Box>
		</>
	);
};

export default CommentNode;
