import GrafcetElement, { Dimensions } from "./GrafcetElement.class";

export type CommentData = {
	text: string;
	width: number;
	height: number;
};

export default class Comment extends GrafcetElement<CommentData> {
	static defaultDimensions: Dimensions = {
		width: 120,
		height: 40,
	};

	static defaultData: CommentData = {
		text: "Commentaire",
		width: Comment.defaultDimensions.width,
		height: Comment.defaultDimensions.height,
	};
}
