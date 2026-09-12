"use client";

import { createContext, useContext } from "react";

/** Vrai quand la page qui englobe l'arbre courant est l'onglet actif. Toutes les pages ouvertes
 * restent montées (`Page` bascule seulement `display`) ; les nœuds/arêtes abonnés à l'état de
 * simulation lisent cette valeur pour court-circuiter leur sélecteur quand leur page est cachée,
 * afin de ne pas se re-rendre à chaque cycle PLC. */
const PageVisibilityContext = createContext(true);

export default PageVisibilityContext;

export const usePageVisible = () => useContext(PageVisibilityContext);
