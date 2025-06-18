import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
//   Badge,
//   HStack,
  StackProps
} from '@chakra-ui/react';
import { LogData, LogType, LogTypeEmojis } from 'aqua-js-sdk/web';
import { useColorModeValue } from '../chakra-ui/color-mode';
// import { LogEntry, LogType, LogTypeEmojis } from '../types/LogTypes';

interface LogViewerProps {
  logs: LogData[];
  title?: string;
  containerProps?: StackProps;
}

const getLogTypeStyles = (logType: LogType) => {
  const baseStyles = {
    transition: 'all 0.2s ease-in-out',
    pl: 4,
    pr: 4,
    py: 2,
    mb: 1,
    borderLeftWidth: '4px',
    roundedRight: 'lg',
    fontFamily: 'mono',
    fontSize: 'sm',
    lineHeight: 'relaxed',
    _hover: { shadow: 'sm' }
  };

  switch (logType) {
    case LogType.SUCCESS:
      return {
        ...baseStyles,
        color: 'green.700',
        bg: 'green.50',
        borderLeftColor: 'green.400'
      };
    case LogType.ERROR:
    case LogType.FINAL_ERROR:
      return {
        ...baseStyles,
        color: 'red.700',
        bg: 'red.50',
        borderLeftColor: 'red.400'
      };
    case LogType.WARNING:
      return {
        ...baseStyles,
        color: 'orange.700',
        bg: 'orange.50',
        borderLeftColor: 'orange.400'
      };
    case LogType.INFO:
      return {
        ...baseStyles,
        color: 'blue.700',
        bg: 'blue.50',
        borderLeftColor: 'blue.400'
      };
    case LogType.HINT:
      return {
        ...baseStyles,
        color: 'purple.700',
        bg: 'purple.50',
        borderLeftColor: 'purple.400'
      };
    case LogType.DEBUGDATA:
      return {
        ...baseStyles,
        color: 'gray.600',
        bg: 'gray.50',
        borderLeftColor: 'gray.300'
      };
    case LogType.ARROW:
      return {
        ...baseStyles,
        color: 'indigo.700',
        bg: 'indigo.50',
        borderLeftColor: 'indigo.400'
      };
    case LogType.FILE:
      return {
        ...baseStyles,
        color: 'teal.700',
        bg: 'teal.50',
        borderLeftColor: 'teal.400'
      };
    case LogType.LINK:
      return {
        ...baseStyles,
        color: 'cyan.700',
        bg: 'cyan.50',
        borderLeftColor: 'cyan.400'
      };
    case LogType.SIGNATURE:
      return {
        ...baseStyles,
        color: 'violet.700',
        bg: 'violet.50',
        borderLeftColor: 'violet.400'
      };
    case LogType.WITNESS:
      return {
        ...baseStyles,
        color: 'pink.700',
        bg: 'pink.50',
        borderLeftColor: 'pink.400'
      };
    case LogType.FORM:
      return {
        ...baseStyles,
        color: 'orange.700',
        bg: 'orange.50',
        borderLeftColor: 'orange.400'
      };
    case LogType.SCALAR:
      return {
        ...baseStyles,
        color: 'gray.700',
        bg: 'gray.50',
        borderLeftColor: 'gray.400'
      };
    case LogType.TREE:
      return {
        ...baseStyles,
        color: 'green.700',
        bg: 'green.50',
        borderLeftColor: 'green.400'
      };
    case LogType.EMPTY:
      return {
        ...baseStyles,
        color: 'transparent',
        h: '8px'
      };
    default:
      return {
        ...baseStyles,
        color: 'gray.700',
        bg: 'gray.50',
        borderLeftColor: 'gray.300'
      };
  }
};

const LogLine: React.FC<{ entry: LogData; index: number }> = ({ entry, index }) => {
  const { log, logType, ident = '' } = entry;
  const emoji = LogTypeEmojis[logType];
  const styles = getLogTypeStyles(logType);
  
  // Handle empty logs
  if (logType === LogType.EMPTY) {
    return <Box key={index} h={2} />;
  }

  // Calculate indentation level
  const indentLevel = (ident??'').length / 4; // Assuming 4 spaces per indent level
  const paddingLeft = Math.max(12 + indentLevel * 16, 12);

  return (
    <Box
      key={index}
      {...styles}
      pl={`${paddingLeft}px`}
    >
      <Flex align="flex-start" gap={2}>
        {emoji && (
          <Text fontSize="md" flexShrink={0} mt={0.5}>
            {emoji}
          </Text>
        )}
        <Text whiteSpace="pre-wrap" wordBreak="break-word" flex={1}>
          {log}
        </Text>
      </Flex>
    </Box>
  );
};

export const LogViewer: React.FC<LogViewerProps> = ({ 
  logs, 
  title = "Execution Logs",
  containerProps
}) => {
//   const headerBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'blackAlpha.300');
  const footerBg = useColorModeValue('gray.50', 'blackAlpha.900');

  return (
    <VStack
      bg="white"
      _dark={{
        bg: 'blackAlpha.900'
      }}
      rounded="lg"
      shadow="lg"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      gap={0}
      align="stretch"
      {...containerProps}
      w="100%"
    >
      {/* Header */}
      <Box
        // bgGradient={`linear(to-r, gray.50, gray.100)`}
        px={6}
        py={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
      >
        <Heading size="md" color="gray.800" _dark={{ color: 'white' }} display="flex" alignItems="center" gap={2}>
          <Text color="blue.600">📋</Text>
          {title}
        </Heading>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} mt={1}>
          {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
        </Text>
      </Box>

      {/* Log Content */}
      <Box maxH="96" overflowY="auto" bg="gray.50">
        <Box p={4} gap={0} _dark={{ bg: 'blackAlpha.900' }}>
          {logs.length === 0 ? (
            <Box textAlign="center" py={8} color="gray.500">
              <Text fontSize="4xl" mb={2}>📝</Text>
              <Text>No logs to display</Text>
            </Box>
          ) : (
            logs.map((entry, index) => (
              <LogLine key={index} entry={entry} index={index} />
            ))
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box
        bg={footerBg}
        px={6}
        py={3}
        borderTopWidth="1px"
        borderColor={borderColor}
      >
        <Flex justify="space-between" align="center" fontSize="xs" color="gray.500" _dark={{ color: 'gray.300' }}>
          <Text>Execution completed</Text>
          <Text>{new Date().toLocaleTimeString()}</Text>
        </Flex>
      </Box>
    </VStack>
  );
};