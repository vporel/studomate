export type RunnableCallback<T extends Runnable> = (runnable: T) => void | undefined;

export default abstract class Runnable {
	public abstract start(): void;

	public abstract stop(): void;

	public abstract isRunning(): boolean;

	protected executeCallback(callback?: RunnableCallback<this>, messageOnError?: string): void {
		try {
			if (callback) callback(this);
		} catch (e) {
			console.error(messageOnError || "Error during runnable callback execution:", e);
		}
	}
}
