/**
 * Byte pipe to the board. Chunks are exchanged as strings carrying one byte per character
 * (code 0 to 255), which keeps the text protocol readable and lets the STK500 flasher send raw
 * bytes.
 */
export interface SerialTransport {
	open(): Promise<void>;
	write(data: string): Promise<void>;
	/** Returns the unsubscribe function. */
	onData(listener: (chunk: string) => void): () => void;
	/** Fires when the port disappears or fails (cable unplugged), not on `close()`. */
	onClose(listener: () => void): () => void;
	close(): Promise<void>;
}
