import { useCallback } from "react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import LadderCommandsStackManager from "@/ui/stores/ladder/managers/commands-stack.manager";
import {
	PendingSystemBlockCreation,
	PendingSystemBlockEdit,
} from "@/ui/utils/ladder/ladder-system-block-drag";

export type SystemBlockDialogState = {
	pendingCreation: PendingSystemBlockCreation | null;
	pendingEdit: PendingSystemBlockEdit | null;
	creating: boolean;
	editing: boolean;
	open: boolean;
	close: () => void;
	commandsStackManager: LadderCommandsStackManager;
};

/**
 * Câblage commun aux dialogs de blocs système à fenêtre de configuration (timer/counter) :
 * lecture des stores `pendingSystemBlockCreation`/`pendingSystemBlockEdit`, ouverture/fermeture.
 * Chaque dialog garde son propre état local de champs et sa propre logique de soumission
 * (insert/update). Les blocs compare/assign/arithmetic se configurent sur le canevas, sans dialog.
 */
export function useSystemBlockDialog(
	blockType: PendingSystemBlockCreation["blockType"],
): SystemBlockDialogState {
	const pendingCreation = useLadderStore(
		(state) => state.pendingSystemBlockCreation,
	);
	const setPendingSystemBlockCreation = useLadderStore(
		(state) => state.setPendingSystemBlockCreation,
	);
	const pendingEdit = useLadderStore((state) => state.pendingSystemBlockEdit);
	const setPendingSystemBlockEdit = useLadderStore(
		(state) => state.setPendingSystemBlockEdit,
	);
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);

	const creating = pendingCreation?.blockType === blockType;
	const editing = pendingEdit?.blockType === blockType;
	const open = creating || editing;

	const close = useCallback(() => {
		setPendingSystemBlockCreation(null);
		setPendingSystemBlockEdit(null);
	}, [setPendingSystemBlockCreation, setPendingSystemBlockEdit]);

	return {
		pendingCreation,
		pendingEdit,
		creating,
		editing,
		open,
		close,
		commandsStackManager,
	};
}
