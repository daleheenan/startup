'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getToken, logout } from '../../../lib/auth';
import ProjectNavigation from '../../../components/shared/ProjectNavigation';
import { useProjectNavigation } from '../../../hooks/useProjectProgress';

// Lazy load AnalyticsDashboard - heavy component with charts
const AnalyticsDashboard = dynamic(() => import('../../../components/AnalyticsDashboard'), {
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
      Loading analytics...
    </div>
  ),
  ssr: false, // Analytics don't need SSR
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Book {
  id: string;
  title: string;
  book_number: number;
}

export default function AnalyticsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  // IMPORTANT: All hooks must be called before any early returns
  const navigation = useProjectNavigation(projectId, project);

  useEffect(() => {
    if (projectId) {
      fetchBooks();
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data.books || []);

      // Select first book by default
      if (data.books && data.books.length > 0) {
        setSelectedBookId(data.books[0].id);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '72px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/projects"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '1.25rem',
            textDecoration: 'none',
          }}
        >
          N
        </Link>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header style={{
          padding: '1rem 2rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1A1A2E',
              margin: 0,
            }}>
              Analytics
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              {project?.title || 'Loading...'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Book Selector */}
            {books.length > 1 && (
              <select
                value={selectedBookId || ''}
                onChange={(e) => setSelectedBookId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  background: 'white',
                }}
              >
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title || `Book ${book.book_number}`}
                  </option>
                ))}
              </select>
            )}
            <Link
              href={`/projects/${projectId}`}
              style={{
                padding: '0.5rem 1rem',
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              ← Back to Project
            </Link>
          </div>
        </header>

        {/* Project Navigation */}
        <ProjectNavigation
          projectId={projectId}
          project={navigation.project}
          outline={navigation.outline}
          chapters={navigation.chapters}
        />

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          Loading...
        </div>
      ) : !selectedBookId ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p>No books found for this project.</p>
        </div>
          ) : (
            <AnalyticsDashboard key={selectedBookId} bookId={selectedBookId} />
          )}
        </div>
      </main>
    </div>
  );
}
