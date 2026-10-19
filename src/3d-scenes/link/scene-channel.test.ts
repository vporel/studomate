import { createTransportPair } from "@tests/utils/transport-pair";
import SceneChannel from "./scene-channel";
import type {
	EditorToSceneMessage,
	SceneToEditorMessage,
} from "./scene-messages";

describe("SceneChannel", () => {
	it("delivers a sent message to the other end", () => {
		const [ta, tb] = createTransportPair();
		const editor = new SceneChannel<EditorToSceneMessage, SceneToEditorMessage>(
			ta,
		);
		const scene = new SceneChannel<SceneToEditorMessage, EditorToSceneMessage>(
			tb,
		);
		const received: EditorToSceneMessage[] = [];
		scene.onMessage((message) => received.push(message));

		editor.send({
			type: "config",
			sceneId: "carton-sorting",
			sceneVersion: 1,
			projectName: "P",
		});

		expect(received).toEqual([
			{
				type: "config",
				sceneId: "carton-sorting",
				sceneVersion: 1,
				projectName: "P",
			},
		]);
	});

	it("drops what is not a message of the protocol", () => {
		const [ta, tb] = createTransportPair();
		const scene = new SceneChannel<SceneToEditorMessage, EditorToSceneMessage>(
			tb,
		);
		const handler = jest.fn();
		scene.onMessage(handler);

		ta.postMessage({ type: "ping", protocolVersion: 999 });
		ta.postMessage("garbage");

		expect(handler).not.toHaveBeenCalled();
	});

	it("reports a message of another protocol version without delivering it", () => {
		const [ta, tb] = createTransportPair();
		const scene = new SceneChannel<SceneToEditorMessage, EditorToSceneMessage>(
			tb,
		);
		const handler = jest.fn();
		const onForeignVersion = jest.fn();
		scene.onMessage(handler, onForeignVersion);

		ta.postMessage({ type: "ping", protocolVersion: 999 });
		ta.postMessage("garbage");

		expect(handler).not.toHaveBeenCalled();
		expect(onForeignVersion).toHaveBeenCalledTimes(1);
		expect(onForeignVersion).toHaveBeenCalledWith("ping");
	});

	it("stops delivering and closes the transport on close", () => {
		const [ta, tb] = createTransportPair();
		const editor = new SceneChannel<EditorToSceneMessage, SceneToEditorMessage>(
			ta,
		);
		const scene = new SceneChannel<SceneToEditorMessage, EditorToSceneMessage>(
			tb,
		);
		const handler = jest.fn();
		scene.onMessage(handler);

		scene.close();
		editor.send({ type: "ping" });

		expect(handler).not.toHaveBeenCalled();
		expect(tb.close).toHaveBeenCalledTimes(1);
	});
});
