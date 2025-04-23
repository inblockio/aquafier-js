import { useMemo, useState } from 'react';
import {
  ReactFlow,
  // addEdge,
  useNodesState,
  useEdgesState,
  // MiniMap,
  Background,
  Controls,
  // Panel,
  Position,
  type Node,
  type Edge,
  type ColorMode,
  // type OnConnect,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box } from '@chakra-ui/react';
import chainData from '../../assets/chain.json';
import RevisionNode from './RevisionNode';

const nodeTypes: NodeTypes = {
  "revision": RevisionNode,
};

// Define spacing constants (adjust as needed)
const HORIZONTAL_SPACING = 300;
const VERTICAL_SPACING = 150;

const HierarchicalChain = () => {
  const [colorMode] = useState<ColorMode>('dark');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
  };

  useMemo(() => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const nodePositions: Record<string, { x: number; y: number }> = {};
    const processedChains = new Set<string>();
    
    // Parse the linkedChains object to create a mapping from parent hash to linked chain hashes
    const parentToLinkedChains: Record<string, string[]> = {};
    const compoundToLinkedChain: Record<string, any> = {}; // Maps compound key to chain data
    
    // Process the top-level linkedChains with compound keys
    const topLevelLinkedChains = chainData.linkedChains as Record<string, any>;
    Object.entries(topLevelLinkedChains).forEach(([compoundKey, chainData]) => {
      // Parse the compound key: parentHash_linkedChainHash
      const [parentHash, linkedChainHash] = compoundKey.split('_');
      
      if (!parentHash || !linkedChainHash) {
        console.error(`Invalid compound key format: ${compoundKey}`);
        return;
      }
      
      // Initialize the array for this parent if it doesn't exist
      if (!parentToLinkedChains[parentHash]) {
        parentToLinkedChains[parentHash] = [];
      }
      
      // Add the linked chain hash to this parent's array
      parentToLinkedChains[parentHash].push(linkedChainHash);
      
      // Store the chain data under the compound key
      compoundToLinkedChain[compoundKey] = chainData;
    });
    
    console.log("Parent to LinkedChains mapping:", parentToLinkedChains);

    // Recursive function to process a chain and its linked chains
    const processChain = (
        chainRevisions: Record<string, any>,
        parentHash: string | null,
        startX: number,
        startY: number
    ): number => {
      const chainHashes = Object.keys(chainRevisions);
      if (!chainHashes.length) return startY;

      let maxY = startY;

      // Find the head of this specific chain segment
      let headHash: string | null = null;
      const revisionSet = new Set(chainHashes);
      for (const hash of chainHashes) {
          const prevHash = chainRevisions[hash]?.previous_verification_hash;
          if (!prevHash || !revisionSet.has(prevHash)) {
              headHash = hash;
              if (parentHash) {
                  allEdges.push({
                      id: `link-${parentHash}-${headHash}`,
                      source: parentHash,
                      target: headHash,
                      style: { stroke: '#ffcc00', strokeWidth: 2 },
                      animated: false,
                  });
              }
              break;
          }
      }

      if (!headHash) {
        console.error("Could not find head hash for chain segment:", chainRevisions);
        headHash = chainHashes[0]; // Basic fallback
         if (parentHash && headHash && !allEdges.some(e => e.id === `link-${parentHash}-${headHash}`)) {
             allEdges.push({
                 id: `link-${parentHash}-${headHash}`,
                 source: parentHash,
                 target: headHash,
                 style: { stroke: '#ffcc00', strokeWidth: 2 },
                 animated: false,
             });
         }
      }

      // Layout this chain horizontally
      let currentHash: string | null = headHash;
      let currentX = startX;

      while (currentHash) {
        if (!chainRevisions[currentHash]) break;

        const revision = chainRevisions[currentHash];
        const currentY = startY;
        maxY = Math.max(maxY, currentY);

        // Create node if not already created
        if (!nodePositions[currentHash]) {
            nodePositions[currentHash] = { x: currentX, y: currentY };
            allNodes.push({
                id: currentHash,
                type: 'revision',
                position: nodePositions[currentHash],
                data: {
                    hash: currentHash,
                    revision: revision,
                    onNodeClick: (nodeId: string) => console.log(`Node ${nodeId} clicked!`),
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            });
        }

        // Find the next hash in this specific chain sequence
        const nextHash = chainHashes.find(h => chainRevisions[h]?.previous_verification_hash === currentHash);

        // Create edge to the next node in this sequence
        if (nextHash && chainRevisions[nextHash] && !allEdges.some(e => e.id === `${currentHash}-${nextHash}`)) {
          allEdges.push({
            id: `${currentHash}-${nextHash}`,
            source: currentHash,
            target: nextHash,
            animated: true,
            data: { isHighlighted: false }
          });
        }

        // --- Process Linked Chains ---
        // Look for linked chains where this revision is the parent
        const linkedChainHashes = parentToLinkedChains[currentHash] || [];
        if (linkedChainHashes.length > 0) {
          let childStartY = maxY + VERTICAL_SPACING;
          let currentSubChainMaxY = startY;

          for (const linkedChainHash of linkedChainHashes) {
            // Create the compound key to look up the chain data
            const compoundKey = `${currentHash}_${linkedChainHash}`;
            
            if (compoundToLinkedChain[compoundKey] && !processedChains.has(compoundKey)) {
                processedChains.add(compoundKey);
                const subChain = compoundToLinkedChain[compoundKey];
                const subChainStartX = nodePositions[currentHash!].x;

                const actualChildStartY = currentSubChainMaxY === startY 
                  ? childStartY 
                  : currentSubChainMaxY + VERTICAL_SPACING;

                const subChainMaxY = processChain(
                    subChain.revisions,
                    currentHash,
                    subChainStartX,
                    actualChildStartY
                );
                currentSubChainMaxY = Math.max(currentSubChainMaxY, subChainMaxY);
            }
          }
          maxY = Math.max(maxY, currentSubChainMaxY);
        }
        // --- End Process Linked Chains ---

        currentHash = nextHash || null;
        currentX += HORIZONTAL_SPACING;
      }
      return maxY;
    };

    // Initial call - pass the main revisions
    processChain(
        chainData.revisions as Record<string, any>,
        null,
        0,
        0
    );

    console.log("Final Nodes:", allNodes.length);
    console.log("Final Edges:", allEdges.length);

    const uniqueNodes = Array.from(new Map(allNodes.map(n => [n.id, n])).values());
    const uniqueEdges = Array.from(new Map(allEdges.map(e => [e.id, e])).values());

    setNodes(uniqueNodes);
    setEdges(uniqueEdges);

  }, [setNodes, setEdges]);

  const proOptions = { hideAttribution: true };

  return (
    <Box w="100%" h="calc(100vh - 0px)">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        colorMode={colorMode}
        nodeTypes={nodeTypes}
        fitView
        proOptions={proOptions}
      >
      {/* <MiniMap /> */}
      <Background />
      <Controls />

    </ReactFlow>
    </Box>
  );
};

export default HierarchicalChain;