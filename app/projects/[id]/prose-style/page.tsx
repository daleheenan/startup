'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProseStyleEditor from '../../../components/ProseStyleEditor';

export default function ProseStylePage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Navigation */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #ddd',
        padding: '16px 24px',
        marginBottom: '24px'
      }}>
        <Link
          href={`/projects/${projectId}`}
          style={{
            color: '#2196F3',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          ← Back to Project
        </Link>
      </nav>

      {/* Main Content */}
      <ProseStyleEditor projectId={projectId} />
    </div>
  );
}
