'use client';

import { spacing } from '@/app/lib/design-tokens';
import PenNameCard from './PenNameCard';
import type { PenName } from '@/app/hooks/usePenNames';

interface PenNamesListProps {
  penNames: PenName[];
}

export default function PenNamesList({ penNames }: PenNamesListProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: spacing[6],
      }}
    >
      {penNames.map((penName) => (
        <PenNameCard key={penName.id} penName={penName} />
      ))}
    </div>
  );
}
