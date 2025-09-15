'use client'
import React, { createContext, Dispatch, SetStateAction, useContext, useState } from 'react';
import { NodeTypeKey } from '../grafcet-nodes-definitions';
 
const GrafcetToolbarDnDContext = createContext<[
	type: NodeTypeKey|null, 
	setType: Dispatch<SetStateAction<NodeTypeKey|null>>
]>([null, (_) => {}]);
 
export const GrafcetToolbarDnDProvider = ({ children }: {children: React.ReactNode}) => {
  const [type, setType] = useState<NodeTypeKey|null>(null);
 
  return (
    <GrafcetToolbarDnDContext.Provider value={[type, setType]}>
      {children}
    </GrafcetToolbarDnDContext.Provider>
  );
}
 
export default GrafcetToolbarDnDContext;
 
export const useGrafcetToolbarDnD = () => {
  return useContext(GrafcetToolbarDnDContext);
}