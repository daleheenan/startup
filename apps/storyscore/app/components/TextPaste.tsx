'use client';

import { useState, useEffect } from 'react';

interface TextPasteProps {
  onTextChange: (text: string) => void;
  placeholder?: string;
}

export default function TextPaste({ onTextChange, placeholder = 'Paste your manuscript here...' }: TextPasteProps) {
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
    onTextChange(text);
  }, [text, onTextChange]);

  const handlePaste = (e: React.ClipboardEvent) => {
    // Allow default paste behaviour
  };

  const clearText = () => {
    setText('');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="textarea min-h-[400px] font-mono text-sm"
          rows={20}
        />
        {text && (
          <button
            onClick={clearText}
            className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors"
            title="Clear text"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div className="flex space-x-6 text-text-secondary">
          <span>
            <span className="font-semibold text-text">{wordCount.toLocaleString()}</span> words
          </span>
          <span>
            <span className="font-semibold text-text">{charCount.toLocaleString()}</span> characters
          </span>
        </div>

        {/* Warning for very large texts */}
        {wordCount > 100000 && (
          <span className="text-amber-400 flex items-centre space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Large text - analysis may take longer</span>
          </span>
        )}
      </div>

      {/* Helpful tips */}
      {wordCount === 0 && (
        <div className="card bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-text-secondary">
              <p className="font-semibold text-blue-400 mb-1">Tip</p>
              <p>
                Paste your complete manuscript or individual chapters. The more context provided,
                the better the analysis will be.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
