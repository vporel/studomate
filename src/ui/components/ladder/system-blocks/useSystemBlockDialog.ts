import { useCallback } from "react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import CommandsStackManager from "@/ui/stores/ladder/managers/commands-stack.manager";
import { PendingSystemBlockCreation, PendingSystemBlockEdit } from "@/ui/utils/ladder/ladder-system-block-drag";

export type SystemBlockDialogState = {
	pendingCreation: PendingSystemBlockCreation | null;
	pendingEdit: PendingSystemBlockEdit | null;
	creating: boolean;
	editing: boolean;
	open: boolean;
	close: () => void;
	commandsStackManager: CommandsStackManager;
};

/**
 * Câblage commun aux 4 dialogs de blocs système (timer/counter/compare/assign) : lecture des
 * stores `pendingSystemBlockCreation`/`pendingSystemBlockEdit`, ouverture/fermeture. Chaque dialog
 * garde son propre état local de champs et sa propre logique de soumission (insert/update) —
 * les valeurs par défaut et les champs modifiables diffèrent réellement d'une famille à l'autre,
 * donc pas factorisés ici.
 */
export function useSystemBlockDialog(blockType: PendingSystemBlockCreation["blockType"]): SystemBlockDialogState {
	const pendingCreation = useLadderStore((state) => state.pendingSystemBlockCreation);
	const setPendingSystemBlockCreation = useLadderStore((state) => state.setPendingSystemBlockCreation);
	const pendingEdit = useLadderStore((state) => state.pendingSystemBlockEdit);
	const setPendingSystemBlockEdit = useLadderStore((state) => state.setPendingSystemBlockEdit);
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);

	const creating = pendingCreation?.blockType === blockType;
	const editing = pendingEdit?.blockType === blockType;
	const open = creating || editing;

	const close = useCallback(() => {
		setPendingSystemBlockCreation(null);
		setPendingSystemBlockEdit(null);
	}, [setPendingSystemBlockCreation, setPendingSystemBlockEdit]);

	return { pendingCreation, pendingEdit, creating, editing, open, close, commandsStackManager };
}
