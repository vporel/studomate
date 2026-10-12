/** Byte pipe to the board. ASCII only, so chunks are exchanged as strings. */
export interface SerialTransport {
	open(): Promise<void>;
	write(data: string): Promise<void>;
	/** Returns the unsubscribe function. */
	onData(listener: (chunk: string) => void): () => void;
	/** Fires when the port disappears or fails (cable unplugged), not on `close()`. */
	onClose(listener: () => void): () => void;
	close(): Promise<void>;
}
