
import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // You could add a more user-facing error message here if desired
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy}
      className={`mt-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${!textToCopy ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 
                  copied ? 'bg-green-500 hover:bg-green-600 text-white' : 
                           'bg-blue-500 hover:bg-blue-600 text-white'}`}
    >
      {copied ? 'Copied!' : 'Copy to Clipboard'}
    </button>
  );
};

export default CopyButton;
