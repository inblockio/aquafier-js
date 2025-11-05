import React, { useState, JSX } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';

interface LogEntry {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface VerificationResult {
  success: boolean;
  message: string;
  domain: string;
  expectedWallet?: string;
  totalRecords: number;
  verifiedRecords: number;
  results: any[];
  logs: LogEntry[];
  dnssecValidated: boolean;
}

interface ImprovedDNSLogsProps {
  verificationResult: VerificationResult;
  verificationMessage: string;
  showLogs: boolean;
  onToggleLogs: () => void;
}

const ImprovedDNSLogs: React.FC<ImprovedDNSLogsProps> = ({
  verificationResult,
//   verificationMessage,
  showLogs,
//   onToggleLogs,
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleLogExpansion = (index: number): void => {
    const newExpanded: Set<number> = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const getLogIcon = (level: LogEntry['level']): JSX.Element => {
    switch (level) {
      case 'success':
        return <FaCheckCircle className="text-green-500 text-sm" />;
      case 'error':
        return <FaTimesCircle className="text-red-500 text-sm" />;
      case 'warning':
        return <FaExclamationTriangle className="text-amber-500 text-sm" />;
      case 'info':
      default:
        return <FaInfoCircle className="text-blue-500 text-sm" />;
    }
  };

  const getLogBorderColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'success':
        return 'border-l-green-400';
      case 'error':
        return 'border-l-red-400';
      case 'warning':
        return 'border-l-amber-400';
      case 'info':
      default:
        return 'border-l-blue-400';
    }
  };

  const getLogBackgroundColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-amber-50';
      case 'info':
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className="w-full">
      {/* Logs Section */}
      {showLogs && verificationResult?.logs?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-5">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Verification Logs
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {verificationResult.logs.length} entries
                </span>
              </div>
              {/* <button
                onClick={onToggleLogs}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                <FaTimes className="text-sm" />
              </button> */}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {verificationResult.logs.map((log, index) => (
              <div
                key={index}
                className={`${getLogBackgroundColor(
                  log.level
                )} border-l-4 ${getLogBorderColor(log.level)}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log.level)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 pr-4">
                          {log.message}
                        </p>

                        {log.details && (
                          <button
                            onClick={() => toggleLogExpansion(index)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-white/50 transition-colors"
                          >
                            {expandedLogs.has(index) ? (
                              <FaChevronUp className="text-xs" />
                            ) : (
                              <FaChevronDown className="text-xs" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide
                          ${
                            log.level === 'success'
                              ? 'bg-green-100 text-green-800'
                              : log.level === 'error'
                              ? 'bg-red-100 text-red-800'
                              : log.level === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-xs text-gray-500">
                          Step {index + 1} of {verificationResult.logs.length}
                        </span>
                      </div>

                      {/* Expandable details */}
                      {log.details && expandedLogs.has(index) && (
                        <div className="mt-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                              Details
                            </span>
                          </div>
                          <div className="p-3">
                            <pre className="text-xs text-gray-800 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                              {typeof log.details === 'string'
                                ? log.details
                                : JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Verification completed successfully
              </span>
              <span className="text-gray-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedDNSLogs;