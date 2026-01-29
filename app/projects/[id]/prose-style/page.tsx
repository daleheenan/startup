'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import ProjectNavigation from '../../../components/shared/ProjectNavigation';
import { useProjectNavigation } from '@/app/hooks';
import { fetchJson } from '../../../lib/fetch-utils';

// Lazy load ProseStyleEditor - large editor component
const ProseStyleEditor = dynamic(() => import('../../../components/ProseStyleEditor'), {
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
      Loading prose style editor...
    </div>
  ),
  ssr: false,
});

export default function ProseStylePage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);

  // IMPORTANT: All hooks must be called before any early returns
  const navigation = useProjectNavigation(projectId, project);

  useEffect(() => {
    fetchJson(`/api/projects/${projectId}`).then(setProject).catch(console.error);
  }, [projectId]);

  return (
    <DashboardLayout
      header={{ title: 'Prose Style', subtitle: project?.title || 'Loading...' }}
    >
      <ProjectNavigation
        projectId={projectId}
        project={navigation.project}
        outline={navigation.outline}
        chapters={navigation.chapters}
      />

      {/* Main Content */}
      <div style={{ padding: '1.5rem 0' }}>
        <ProseStyleEditor projectId={projectId} />
      </div>
    </DashboardLayout>
  );
}
