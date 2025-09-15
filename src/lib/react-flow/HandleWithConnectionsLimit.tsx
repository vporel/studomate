'use client'
import React from 'react';
import { Handle, HandleProps, useNodeConnections } from '@xyflow/react';
 
const HandleWithConnectionsLimit = (props: HandleProps & Omit<React.HTMLAttributes<HTMLDivElement>, "id"> & {limit: number}) => {
  const connections = useNodeConnections({handleType: props.type});
  
  const handleConnections = connections.filter((c: any) => c[props.type+"Handle"] == props.id)
  
  return (
    <Handle
      {...props}
      isConnectable={handleConnections.length < props.limit}
    />
  );
};
 
export default HandleWithConnectionsLimit;