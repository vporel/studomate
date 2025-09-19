'use client'
import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, addEdge, Background, useNodesState, useEdgesState, ConnectionLineType, useReactFlow, ReactFlowProvider, XYPosition, Dimensions, useKeyPress } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './_grafcet-page.css';
import { FLOW_GRID_CELL_WIDTH, PAPERS_SIZES } from '@/constants';
import { mmToPx } from '@/lib/utils';
import { Box, useTheme } from '@mui/material';
import { useGrafcetToolbarDnD } from './toolbar/GrafcetToolbarDnDContext';
import { edgeTypes, GrafcetNode, nodesDefaultData, nodesDefaultDimensions, nodeTypes, testEdges, testNodes, validateConnection } from './grafcet-nodes-definitions';
import { createElementId } from '@/schemas/schemas-helpers';
import { usePagesContext } from '@/PagesContext';
import CustomConnectionLine from './CustomConnectionLine';
import GrafcetContextMenu from './context-menu/GrafcetContextMenu';
import { GrafcetPageContextProvider, useGrafcetPageContext } from './GrafcetPageContext';
import useFlowToolDragOverHandlers from './useFlowToolDragOverHandlers';
import useFlowContextMenuActionsHandlers from './useFlowContextMenuActionsHandlers';
import useFlowShortcutsHandler from './useFlowShortcutsHandler';
 
export function GrafcetPageContent({pageId}: {pageId: string}) {
  const th = useTheme()
  const [nodes, setNodes, onNodesChange] = useNodesState<GrafcetNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const {screenToFlowPosition} = useReactFlow()
  const {updatePageData} = usePagesContext()
  const {flowDimensions, contextMenuEvents} = useGrafcetPageContext()
  const [handleToolDragOver, handleToolDrop] = useFlowToolDragOverHandlers()
  const handleShortcuts = useFlowShortcutsHandler()

  const onConnect = useCallback(
    (params: any) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges],
  );

  //Share the grafcet data
  useEffect(() => {
    updatePageData(pageId, {
      width: mmToPx(PAPERS_SIZES.A4_PORTRAIT.width),
      height: mmToPx(PAPERS_SIZES.A4_PORTRAIT.height),
      nodes
    })
  }, [nodes])

  //Initial data
  // useEffect(() => {
  //   setNodes(testNodes as any)
  //   setEdges(testEdges)
  // }, [])

  //Context menu actions
  useFlowContextMenuActionsHandlers()
  
 
  return (
    <Box className="grafcet-page" id={pageId} sx={{
        padding: '25px', 
        width: '100%', height: '100%', overflow: 'auto',
        background: '#dedede', position: 'relative'
    }}>  
      <Box sx={{
        width: flowDimensions.width+'px', 
        height: flowDimensions.height+'px', 
        border: '1px solid lightgray',
        backgroundClip: 'content-box', boxSizing: 'border-box',
        marginLeft: "50%",
        transform: "translate(-50%, 0)",
        '.react-flow__pane': {
          cursor: "default"
        },
        '.react-flow__edge-path': {
          stroke: 'black'
        },
        '.react-flow__edge.selected .react-flow__edge-path, .react-flow__edge.selectable:focus .react-flow__edge-path': {
          stroke: th.palette.primary.main
        }
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{type: "custom-edge"}}
          connectionLineComponent={CustomConnectionLine}
          isValidConnection={connection => validateConnection(connection, nodes)}
          minZoom={0.5}
          maxZoom={2}
          snapToGrid={true}
          selectionOnDrag={true}
          panOnDrag={false}
          snapGrid={[FLOW_GRID_CELL_WIDTH, FLOW_GRID_CELL_WIDTH]}
          translateExtent={[[0, 0], [flowDimensions.width-2, flowDimensions.height-2]]}
          nodeExtent={[[0, 0], [flowDimensions.width-2, flowDimensions.height-2]]}
          onDragOver={handleToolDragOver}
          onDrop={handleToolDrop}
          tabIndex={0} //This attribute is necessary so that the flow can be focused with the mouse click
          onKeyDown={handleShortcuts}
          onPaneContextMenu={e => {
            e.preventDefault()
            contextMenuEvents.emit("show", {element: {type: "pane"}, position: screenToFlowPosition({x: e.pageX, y: e.pageY})})
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault()
            contextMenuEvents.emit("show", {element: node, position: screenToFlowPosition({x: e.pageX, y: e.pageY})})
          }}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault()
            contextMenuEvents.emit("show", {element: edge, position: screenToFlowPosition({x: e.pageX, y: e.pageY})})
          }}
          zoomOnScroll={false}
          onWheelCapture={e => {
            if(!e.ctrlKey && !e.metaKey) e.stopPropagation()
          }}
        >
          <Background bgColor='white'/>
          <GrafcetContextMenu  />
        </ReactFlow>
      </Box>
    </Box>
  );
}

export default function GrafcetPage({pageId}: {pageId: string}){
  return <GrafcetPageContextProvider>
    <ReactFlowProvider>
      <GrafcetPageContent pageId={pageId} />
    </ReactFlowProvider>
  </GrafcetPageContextProvider>
}