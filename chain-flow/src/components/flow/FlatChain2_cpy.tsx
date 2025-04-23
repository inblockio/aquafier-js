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
  // Position,
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
 
const Flatchain2 = () => {
  const [colorMode] = useState<ColorMode>('dark');
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
 
  // const onConnect: OnConnect = useCallback(
  //   (params) => setEdges((eds) => addEdge(params, eds)),
  //   [setEdges],
  // );

  const onNodeClick = (event: MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
  };
 
  // const onChange: ChangeEventHandler<HTMLSelectElement> = (evt) => {
  //   setColorMode(evt.target.value as ColorMode);
  // };

  const _res = useMemo(() => {
    const revisions = chainData.revisions as Record<string, any>;
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Create a mapping of hash to node index for ordering
    const hashToNode: Record<string, number> = {};
    const allHashes: string[] = [];
    
    // First pass: create nodes and build hash-to-index map
    Object.entries(revisions).forEach(([hash]) => {
      allHashes.push(hash);
    });
    
    // Build a linked list of hashes based on previous hash references
    const linkedList: string[] = [];
    const hashSet = new Set(allHashes);
    
    // Find the head (node with no previous hash pointing to it)
    let headHash: string | null = null;
    for (const hash of allHashes) {
      const prevHash = revisions[hash].previous_verification_hash;
      if (prevHash === "" || !hashSet.has(prevHash)) {
        headHash = hash;
        break;
      }
    }
    
    // Build the ordered list by following previous hash links
    if (headHash) {
      let currentHash = headHash;
      while (currentHash) {
        linkedList.push(currentHash);
        
        // Find the next hash (one that has current as its previous)
        let nextHash: string | null = null; 
        for (const hash of allHashes) {
          if (hash !== currentHash && revisions[hash].previous_verification_hash === currentHash) {
            nextHash = hash;
            break;
          }
        }
        
        if (!nextHash) break;
        currentHash = nextHash;
      }
    } else {
      // Fallback: just use the hashes as they are
      linkedList.push(...allHashes);
    }
    
    // Create nodes in the correct order
    linkedList.forEach((hash, index) => {
      const revision = revisions[hash];
      hashToNode[hash] = index;
      
      nodes.push({
        id: hash,
        type: 'revision',
        position: { x: 300 * index, y: 50 },
        data: { 
          hash, 
          revision,
          onNodeClick: (nodeId: string) => {
            console.log(`Custom Node ${nodeId} clicked!`);
          }
        },
      });
    });

    // Create a set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map(node => node.id));
    
    // Create edges based on previous hash relationships
    for (let i = 0; i < linkedList.length; i++) {
      const currentHash = linkedList[i];
      const currentRevision = revisions[currentHash];
      // Handle null, undefined, and empty string by defaulting to "genesis_hash"
      const previousHash = currentRevision.previous_verification_hash || "genesis_hash";
      
      // Only create an edge if the target node exists and the source node
      // is either the conceptual "genesis_hash" or another existing node.
      if (validNodeIds.has(currentHash) && (previousHash === "genesis_hash" || validNodeIds.has(previousHash))) {
        edges.push({
          id: `${previousHash}-${currentHash}`,
          source: previousHash, // Source can be "genesis_hash" or a real hash
          target: currentHash,
          animated: true,
          data: {
            isHighlighted: false
          }
        });
      }
    }
    
    console.log("Created nodes:", nodes.length);
    console.log("Created edges:", edges.length);

    // edges.forEach((edge, index) => {
    //   console.log(`Edge ${index}: ${edge.id}, Source: ${edge.source}, Target: ${edge.target}\n`);
    // });
    setNodes(nodes as Node[]);
    setEdges(edges as Edge[]);
    return { initialNodes: nodes, initialEdges: edges };
  }, []);

  const proOptions = { hideAttribution: true };
 
  return (
    <Box w="100%" h="calc(100vh - 0px)">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(event: any, node) => onNodeClick(event, node)}
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
 
export default Flatchain2;