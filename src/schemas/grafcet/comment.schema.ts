import Element, { BaseData } from "./element.schema";
import { Dimensions } from "./shared-types";

export type CommentData = BaseData & {
	text: string;
};

export default class Comment extends Element<CommentData> {
	readonly type = "comment";

	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 150,
		height: 40,
	};

	static generateDefaultData(): CommentData {
		return {
			text: "Commentaire",
			width: Comment.DEFAULT_DIMENSIONS.width,
			height: Comment.DEFAULT_DIMENSIONS.height,
		};
	}


}
