/** Tableau vide partagé et gelé, à renvoyer depuis un sélecteur zustand quand la valeur est
 * absente (`state.x ?? EMPTY_ARRAY`) : garde une identité stable entre deux exécutions du
 * sélecteur, là où un `?? []` littéral en crée un neuf à chaque tick et provoque des
 * re-renders parasites. Ne jamais y pousser d'élément. */
const EMPTY_ARRAY = Object.freeze([]) as never[];

export default EMPTY_ARRAY;
