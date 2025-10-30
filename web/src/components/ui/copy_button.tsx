import { createSignal } from 'solid-js';
import { Copy, Check } from 'lucide-solid';

interface CopyButtonProps {
  text: string;
  isIcon?: boolean;
}

const CopyButton = (props: CopyButtonProps) => {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      
      // Reset the checkmark after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (props.isIcon) {
    // Just show the icon
    return (
      <button
        onClick={handleCopy}
        class="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={copied() ? 'Copied!' : 'Copy'}
      >
        {copied() ? (
          <Check size={16} class="text-green-500" />
        ) : (
          <Copy size={16} class="text-gray-600 hover:text-gray-800" />
        )}
      </button>
    );
  }

  // Show button with label and icon
  return (
    <button
      onClick={handleCopy}
      class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
    >
      <span>{copied() ? 'Copied!' : 'Copy'}</span>
      {copied() ? (
        <Check size={16} class="text-green-500" />
      ) : (
        <Copy size={16} class="text-gray-600" />
      )}
    </button>
  );
};

export default CopyButton;