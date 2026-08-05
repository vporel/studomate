import AbstractCommand from "./abstract.command";
import CommandsStack from "./commands-stack.schema";

type Counter = { value: number };

class AddCommand extends AbstractCommand<Counter, number> {
	getType(): string {
		return "add";
	}

	execute(object: Counter): [Counter, boolean] {
		return [{ value: object.value + this.payload }, true];
	}

	cancel(object: Counter): Counter {
		return { value: object.value - this.payload };
	}
}

class MultiplyCommand extends AbstractCommand<Counter, number> {
	getType(): string {
		return "multiply";
	}

	execute(object: Counter): [Counter, boolean] {
		return [{ value: object.value * this.payload }, true];
	}

	cancel(object: Counter): Counter {
		return { value: object.value / this.payload };
	}
}

class InvalidCommand extends AbstractCommand<Counter, number> {
	getType(): string {
		return "invalid";
	}

	execute(object: Counter): [Counter, boolean] {
		return [object, false];
	}

	cancel(object: Counter): Counter {
		return object;
	}
}

describe("CommandsStack", () => {
	describe("execute", () => {
		it("applies all valid commands in order and returns the resulting object", () => {
			const stack = new CommandsStack<Counter>();
			const result = stack.execute([new AddCommand(5), new MultiplyCommand(2)], { value: 0 });
			expect(result).toEqual({ value: 10 });
		});

		it("discards invalid commands without applying them", () => {
			const stack = new CommandsStack<Counter>();
			const result = stack.execute([new AddCommand(5), new InvalidCommand(99)], { value: 0 });
			expect(result).toEqual({ value: 5 });
		});

		it("clears the redo stack", () => {
			const stack = new CommandsStack<Counter>();
			let object = stack.execute([new AddCommand(1)], { value: 0 });
			[object] = stack.undo(object);
			object = stack.execute([new AddCommand(2)], object);
			const [, redone] = stack.redo(object);
			expect(redone).toBeNull();
		});
	});

	describe("undo", () => {
		it("restores the exact prior state for interdependent commands by cancelling in reverse order", () => {
			// Add(5) then Multiply(2) on 0 → 10. Undoing forward (Add.cancel then Multiply.cancel)
			// would produce (10 - 5) / 2 = 2.5 instead of the correct 0.
			const stack = new CommandsStack<Counter>();
			const afterExecute = stack.execute([new AddCommand(5), new MultiplyCommand(2)], { value: 0 });
			expect(afterExecute).toEqual({ value: 10 });

			const [afterUndo] = stack.undo(afterExecute);

			expect(afterUndo).toEqual({ value: 0 });
		});

		it("returns null and the object unchanged when there is nothing to undo", () => {
			const stack = new CommandsStack<Counter>();
			const [object, commands] = stack.undo({ value: 0 });
			expect(object).toEqual({ value: 0 });
			expect(commands).toBeNull();
		});

		it("moves the undone batch to the redo stack", () => {
			const stack = new CommandsStack<Counter>();
			const afterExecute = stack.execute([new AddCommand(5)], { value: 0 });
			const [afterUndo] = stack.undo(afterExecute);
			const [afterRedo] = stack.redo(afterUndo);
			expect(afterRedo).toEqual({ value: 5 });
		});
	});

	describe("redo", () => {
		it("re-executes the batch in original order", () => {
			const stack = new CommandsStack<Counter>();
			const afterExecute = stack.execute([new AddCommand(5), new MultiplyCommand(2)], { value: 0 });
			const [afterUndo] = stack.undo(afterExecute);
			const [afterRedo] = stack.redo(afterUndo);
			expect(afterRedo).toEqual({ value: 10 });
		});

		it("returns null and the object unchanged when there is nothing to redo", () => {
			const stack = new CommandsStack<Counter>();
			const [object, commands] = stack.redo({ value: 0 });
			expect(object).toEqual({ value: 0 });
			expect(commands).toBeNull();
		});
	});

	describe("clear", () => {
		it("empties both the undo and redo stacks", () => {
			const stack = new CommandsStack<Counter>();
			const afterExecute = stack.execute([new AddCommand(5)], { value: 0 });
			stack.undo(afterExecute);
			stack.clear();

			const [, undone] = stack.undo({ value: 0 });
			const [, redone] = stack.redo({ value: 0 });
			expect(undone).toBeNull();
			expect(redone).toBeNull();
		});
	});

	describe("undoLimit", () => {
		it("drops the oldest batch once the limit is exceeded", () => {
			const stack = new CommandsStack<Counter>(2);
			let object = { value: 0 };
			object = stack.execute([new AddCommand(1)], object);
			object = stack.execute([new AddCommand(2)], object);
			object = stack.execute([new AddCommand(3)], object);

			expect(stack.commandsToUndo).toHaveLength(2);
			[object] = stack.undo(object);
			[object] = stack.undo(object);
			// Only the last two batches (+2, +3) should remain undoable — the +1 batch was dropped.
			expect(object).toEqual({ value: 1 });
		});
	});
});
