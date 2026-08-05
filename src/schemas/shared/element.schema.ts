/**
 * Interface générique partagée décrivant la structure commune à tous les éléments
 * du domaine (Grafcet, Ladder, etc.) positionnés sur un graphe.
 */
export default interface Element<TType, TData, TPosition> {
	id: string;
	type: TType;
	data: TData;
	position: TPosition;
}
