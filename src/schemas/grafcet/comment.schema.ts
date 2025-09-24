import GrafcetElement, {
	GrafcetElementDimensions,
	GrafcetElementPosition,
} from "./grafcet-element.schema";

export type CommentData = {
	text: string;
	width: number;
	height: number;
};

export default class Comment extends GrafcetElement {
	static defaultDimensions: GrafcetElementDimensions = {
		width: 120,
		height: 40,
	};

	static defaultData: CommentData = {
		text: "Commentaire",
		width: Comment.defaultDimensions.width,
		height: Comment.defaultDimensions.height,
	};

	data: CommentData = Comment.defaultData;

	constructor(
		id: string,
		data: CommentData,
		position: GrafcetElementPosition
	) {
		super(id, position);
		this.data = data;
	}
}
