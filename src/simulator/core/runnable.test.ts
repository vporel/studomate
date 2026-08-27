import Runnable from "./runnable";

class TestRunnable extends Runnable {
	private running: boolean = false;

	start(): void {
		this.running = true;
	}

	stop(): void {
		this.running = false;
	}

	isRunning(): boolean {
		return this.running;
	}

	// Expose protected method for testing
	public testExecuteCallback(
		callback?: (runnable: this) => void,
		messageOnError?: string,
	): void {
		this.executeCallback(callback, messageOnError);
	}
}

describe("Runnable", () => {
	let testRunnable: TestRunnable;

	beforeEach(() => {
		testRunnable = new TestRunnable();
	});

	describe("start/stop", () => {
		it("starts correctly", () => {
			testRunnable.start();
			expect(testRunnable.isRunning()).toBe(true);
		});

		it("stops correctly", () => {
			testRunnable.start();
			testRunnable.stop();
			expect(testRunnable.isRunning()).toBe(false);
		});
	});

	describe("executeCallback", () => {
		it("executes callback successfully", () => {
			const mockCallback = jest.fn();
			testRunnable.testExecuteCallback(mockCallback);
			expect(mockCallback).toHaveBeenCalledWith(testRunnable);
		});

		it("handles callback errors", () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();
			const errorCallback = () => {
				throw new Error("Test error");
			};
			testRunnable.testExecuteCallback(errorCallback, "Custom error message");
			expect(consoleSpy).toHaveBeenCalledWith(
				"Custom error message",
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});

		it("uses default error message when not provided", () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();
			const errorCallback = () => {
				throw new Error("Test error");
			};
			testRunnable.testExecuteCallback(errorCallback);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Error during runnable callback execution:",
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});

		it("does nothing when callback is undefined", () => {
			expect(() => testRunnable.testExecuteCallback(undefined)).not.toThrow();
		});
	});
});
