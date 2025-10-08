
import React, { useState } from 'react';
import SendIcon from './icons/SendIcon';
import SpinnerIcon from './icons/SpinnerIcon';

interface PromptInputProps {
  onNewPrompt: (promptText: string) => void;
  isLoading: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onNewPrompt, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onNewPrompt(prompt);
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/50 p-4 rounded-lg shadow-lg border border-gray-700">
      <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-400 mb-2">
        Enter Prompt
      </label>
      <div className="relative">
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., How do I build a simple website?"
          className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 pr-12 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 resize-none"
          rows={3}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? <SpinnerIcon /> : <SendIcon />}
        </button>
      </div>
    </form>
  );
};

export default PromptInput;
