import ClockedRunnable from "./clocked-runnable";

class TestClockedRunnable extends ClockedRunnable {
	public tickCount = 0;

	constructor(clockIntervalMs: number) {
		super(clockIntervalMs);
	}

	protected tick(): void {
		this.tickCount++;
	}

	// Expose callbacks for testing
	public setOnStart(callback: (runnable: this) => void): void {
		this.onStart = callback;
	}

	public setOnStop(callback: (runnable: this) => void): void {
		this.onStop = callback;
	}
}

describe("ClockedRunnable", () => {
	let testRunnable: TestClockedRunnable;

	beforeEach(() => {
		jest.useFakeTimers();
		testRunnable = new TestClockedRunnable(100);
	});

	afterEach(() => {
		if (testRunnable.isRunning()) {
			testRunnable.stop();
		}
		jest.useRealTimers();
	});

	describe("initialization", () => {
		it("initializes with correct clock interval", () => {
			expect(testRunnable.getClockIntervalMs()).toBe(100);
		});

		it("is not running initially", () => {
			expect(testRunnable.isRunning()).toBe(false);
		});
	});

	describe("start/stop", () => {
		it("starts successfully", () => {
			testRunnable.start();
			expect(testRunnable.isRunning()).toBe(true);
		});

		it("stops successfully", () => {
			testRunnable.start();
			testRunnable.stop();
			expect(testRunnable.isRunning()).toBe(false);
		});

		it("does not start when already running", () => {
			testRunnable.start();
			const onStartSpy = jest.fn();
			testRunnable.setOnStart(onStartSpy);
			testRunnable.start(); // Try to start again
			expect(onStartSpy).not.toHaveBeenCalled();
		});

		it("does not stop when already stopped", () => {
			const onStopSpy = jest.fn();
			testRunnable.setOnStop(onStopSpy);
			testRunnable.stop(); // Try to stop without starting
			expect(onStopSpy).not.toHaveBeenCalled();
		});
	});

	describe("tick execution", () => {
		it("executes tick at specified interval", () => {
			testRunnable.start();
			expect(testRunnable.tickCount).toBe(0);

			jest.advanceTimersByTime(100);
			expect(testRunnable.tickCount).toBe(1);

			jest.advanceTimersByTime(100);
			expect(testRunnable.tickCount).toBe(2);

			jest.advanceTimersByTime(200);
			expect(testRunnable.tickCount).toBe(4);
		});

		it("stops ticking after stop", () => {
			testRunnable.start();
			jest.advanceTimersByTime(200);
			expect(testRunnable.tickCount).toBe(2);

			testRunnable.stop();
			jest.advanceTimersByTime(200);
			expect(testRunnable.tickCount).toBe(2); // No additional ticks
		});
	});

	describe("callbacks", () => {
		it("executes onStart callback when starting", () => {
			const onStartSpy = jest.fn();
			testRunnable.setOnStart(onStartSpy);
			testRunnable.start();
			expect(onStartSpy).toHaveBeenCalledWith(testRunnable);
		});

		it("executes onStop callback when stopping", () => {
			const onStopSpy = jest.fn();
			testRunnable.setOnStop(onStopSpy);
			testRunnable.start();
			testRunnable.stop();
			expect(onStopSpy).toHaveBeenCalledWith(testRunnable);
		});

		it("handles errors in onStart callback", () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();
			testRunnable.setOnStart(() => {
				throw new Error("Start error");
			});
			testRunnable.start();
			expect(consoleSpy).toHaveBeenCalledWith("Error in onStart callback:", expect.any(Error));
			expect(testRunnable.isRunning()).toBe(true); // Runnable should still start
			consoleSpy.mockRestore();
		});

		it("handles errors in onStop callback", () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();
			testRunnable.setOnStop(() => {
				throw new Error("Stop error");
			});
			testRunnable.start();
			testRunnable.stop();
			expect(consoleSpy).toHaveBeenCalledWith("Error in onStop callback:", expect.any(Error));
			expect(testRunnable.isRunning()).toBe(false); // Runnable should still stop
			consoleSpy.mockRestore();
		});
	});

	describe("different clock intervals", () => {
		it("works with different clock intervals", () => {
			const fastRunnable = new TestClockedRunnable(50);
			fastRunnable.start();
			jest.advanceTimersByTime(100);
			expect(fastRunnable.tickCount).toBe(2);
			fastRunnable.stop();

			const slowRunnable = new TestClockedRunnable(200);
			slowRunnable.start();
			jest.advanceTimersByTime(400);
			expect(slowRunnable.tickCount).toBe(2);
			slowRunnable.stop();
		});
	});
});
