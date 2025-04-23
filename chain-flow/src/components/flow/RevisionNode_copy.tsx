import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useColorModeValue } from '../ui/color-mode';
import { convertTimestampToDate } from '../../utils/functions';

// Define the expected shape of the data prop
export interface RevisionNodeData {
  hash: string;
  revision: {
    previous_verification_hash: string;
    timestamp: string;
    revision_type: 'file' | 'signature' | 'link' | string;
    [key: string]: any
    // Add other relevant fields from your revision object here
  };
  onNodeClick: (nodeId: string) => void;
}

// Use NodeProps<RevisionNodeData> for type safety
const RevisionNode = memo(({ data, isConnectable }:{data: RevisionNodeData, isConnectable: boolean}) => {
  // Explicitly type data here if inference fails
  const { hash, revision, onNodeClick } = data as RevisionNodeData;

  // Define colors based on revision type and color mode
  const bg = useColorModeValue(
    revision.revision_type === 'file' ? '#d6eaff' : 
    revision.revision_type === 'signature' ? '#d6ffdc' : 
    revision.revision_type === 'link' ? '#ffe7c7' : '#e8e8e8', // Light mode colors
    
    revision.revision_type === 'file' ? 'rgba(24, 144, 255, 0.3)' : 
    revision.revision_type === 'signature' ? 'rgba(82, 196, 26, 0.3)' : 
    revision.revision_type === 'link' ? 'rgba(250, 173, 20, 0.3)' : 'rgba(80, 80, 80, 0.4)' // Dark mode colors
  );
  
  const borderColor = useColorModeValue(
    revision.revision_type === 'file' ? '#69b1ff' : 
    revision.revision_type === 'signature' ? '#7ad760' : 
    revision.revision_type === 'link' ? '#ffb84d' : '#bbb', // Light mode borders
    
    revision.revision_type === 'file' ? '#1890ff' : 
    revision.revision_type === 'signature' ? '#52c41a' : 
    revision.revision_type === 'link' ? '#faad14' : '#666' // Dark mode borders
  );

  const textColor = useColorModeValue('gray.800', 'white'); // General text color

  const handleClick = () => {
    if (onNodeClick) {
      onNodeClick(hash);
    }
  };

  return (
    <Box
      p={3}
      borderWidth={1}
      borderRadius="md"
      bg={bg}
      borderColor={borderColor}
      color={textColor}
      onClick={handleClick}
      cursor="pointer"
      minWidth="220px"
      maxWidth={"220px"}
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md'
      }}
    >
      {/* Handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      <VStack alignItems="flex-start" gap={1}>
        <Text fontWeight="500" mb={1} fontSize={"xs"} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={hash}>
          {hash.substring(0, 8)}...
        </Text>
        <Text fontSize="2xs" fontWeight="400">Type: {revision.revision_type}</Text>
        <Text fontSize="2xs" fontWeight="400" wordBreak={"break-all"}>Timestamp: {convertTimestampToDate(revision.local_timestamp)}</Text>
      </VStack>

      {/* Handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </Box>
  );
});

RevisionNode.displayName = 'RevisionNode';

export default RevisionNode; 