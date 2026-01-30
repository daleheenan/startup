'use client';

import { errorContainer } from '@/app/lib/styles';

interface ErrorMessageProps {
  message: string;
  style?: React.CSSProperties;
}

export default function ErrorMessage({ message, style }: ErrorMessageProps) {
  return (
    <div style={{ ...errorContainer, ...style }}>
      {message}
    </div>
  );
}
