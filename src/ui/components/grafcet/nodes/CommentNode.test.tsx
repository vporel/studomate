/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import CommentBuilder from "@/schemas/grafcet/builders/comment.builder";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import CommentNode, { CommentNodeType } from "./CommentNode";

jest.mock("../context/GrafcetContext");

function setup({ text = "Un commentaire", updateNodeData = jest.fn() } = {}) {
	const comment = new CommentBuilder().id("comment-1").text(text).position(0, 0).build();
	const grafcet = new GrafcetBuilder().id("g1").addComment(comment).build();

	(useGrafcetContext as jest.Mock).mockReturnValue({ store: fakeStoreApi({ grafcet }) });
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcet,
			workflowManager: { updateNodeData },
			highlightedNodesIds: [],
		}),
	);

	const props = {
		id: "comment-1",
		data: { text },
		selected: false,
		width: 150,
		height: 60,
		type: "comment",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as CommentNodeType & { id: string };

	render(<CommentNode {...(props as any)} />);

	return { updateNodeData };
}

function textarea(): HTMLTextAreaElement {
	return document.querySelector(".comment_node__textarea") as HTMLTextAreaElement;
}

describe("CommentNode", () => {
	it("affiche le texte du commentaire", () => {
		setup({ text: "Étape de démarrage" });
		expect(textarea().value).toBe("Étape de démarrage");
	});

	it("édite le texte au double-clic puis dispatche la commande de mise à jour au blur", () => {
		const { updateNodeData } = setup({ text: "Avant" });
		fireEvent.doubleClick(document.querySelector(".grafcet-comment-node")!);

		fireEvent.change(textarea(), { target: { value: "Après" } });
		fireEvent.blur(textarea());

		expect(updateNodeData).toHaveBeenCalledWith("comment-1", { text: "Après" });
	});
});
