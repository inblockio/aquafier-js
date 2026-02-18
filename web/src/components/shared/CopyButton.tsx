import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';

interface ICopyButton {
    text: string,
    isIcon?: boolean
}

const CopyButton = ({text, isIcon = false}: ICopyButton) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      // Reset the checkmark after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (isIcon) {
    // Just show the icon
    return (
      <Button onClick={handleCopy} size={"icon-sm"} variant={"outline"} className='cursor-pointer'>
        {copied ? (
          <Check size={16} className="text-green-500" />
        ) : (
          <Copy size={16} className="text-gray-600 hover:text-gray-800" />
        )}
      </Button>
    );
  }

  // Show button with label and icon
  return (
    <Button onClick={handleCopy} size={"sm"} variant={"outline"} className='cursor-pointer rounded-md'>
      <span>{copied ? 'Copied!' : 'Copy'}</span>
      {copied ? (
        <Check size={16} className="text-green-500" />
      ) : (
        <Copy size={16} className="text-gray-600" />
      )}
    </Button>
  );
};

export default CopyButton;