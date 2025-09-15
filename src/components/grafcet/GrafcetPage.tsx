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
import GrafcetContextMenu from './GrafcetContextMenu';
import { GrafcetPageContextProvider, useGrafcetPageContext } from './GrafcetPageContext';
 
export function GrafcetPageContent({pageId}: {pageId: string}) {
  const th = useTheme()
  const [nodes, setNodes, onNodesChange] = useNodesState<GrafcetNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [toolType] = useGrafcetToolbarDnD()
  const {screenToFlowPosition} = useReactFlow()
  const {updatePageData} = usePagesContext()
  const {flowDimensions, setContextMenuData} = useGrafcetPageContext()

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if(!toolType) return
    const position = screenToFlowPosition({x: e.pageX, y:e.pageY})
    position.x = position.x - (nodesDefaultDimensions[toolType].width/2)
    position.y = position.y - (nodesDefaultDimensions[toolType].height/2)
    const newNode = {
      id: createElementId(),
      type: toolType,
      position,
      data: nodesDefaultData[toolType]
    } as GrafcetNode
    setNodes(nds => nds.concat([newNode]))
  }, [toolType])

  useEffect(() => {
    const hideContextMenu = () => setContextMenuData(data => ({...data, visible: false}))

    window.addEventListener("mousedown", hideContextMenu)
    return () => {
      window.removeEventListener("mousedown", hideContextMenu)
    }
  }, [])
 
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
          defaultEdgeOptions={{type: "custom"}}
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
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          tabIndex={0} //This attribute is necessary so that the flow can be focused with the mouse click
          onKeyDown={e => {
            //Ctrl+A : Select all
            if((e.ctrlKey || e.metaKey) && e.key == "a"){
              e.preventDefault()
              setNodes(nds => nds.map(n => ({...n, selected: true})))
            }
          }}
          onPaneContextMenu={e => {
            e.preventDefault()
            setContextMenuData(data => ({...data, elementType: "pane", position: screenToFlowPosition({x: e.pageX, y: e.pageY}), visible: true}))
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault()
            setContextMenuData(data => ({...data, elementType: "node", elementId: node.id, position: screenToFlowPosition({x: e.pageX, y: e.pageY}), visible: true}))
          }}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault()
            setContextMenuData(data => ({...data, elementType: "edge", elementId: edge.id, position: screenToFlowPosition({x: e.pageX, y: e.pageY}), visible: true}))
          }}
          zoomOnScroll={false}
          onWheelCapture={e => {
            if(!e.ctrlKey && !e.metaKey) e.stopPropagation()
          }}
        >
          <Background bgColor='white'/>
          <GrafcetContextMenu 
            onHide={() => setContextMenuData(data => ({...data, visible: false}))}
          />
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