'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ChapterEditor from '../../../../components/ChapterEditor';
import { getToken, logout } from '../../../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  status: string;
  word_count: number;
}

interface Book {
  id: string;
  project_id: string;
  title: string;
  book_number: number;
}

export default function ChapterEditPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const chapterId = params.chapterId as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chapterId) {
      fetchChapterInfo();
    }
  }, [chapterId]);

  const fetchChapterInfo = async () => {
    try {
      const token = getToken();

      // Fetch chapter
      const chapterRes = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!chapterRes.ok) {
        if (chapterRes.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch chapter');
      }

      const chapterData = await chapterRes.json();
      setChapter(chapterData);

      // Fetch book info
      const bookRes = await fetch(`${API_BASE_URL}/api/books/${chapterData.book_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (bookRes.ok) {
        const bookData = await bookRes.json();
        setBook(bookData);
      }
    } catch (err: any) {
      console.error('Error fetching chapter info:', err);
      setError(err.message || 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading chapter...</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Error</h2>
        <p style={styles.errorText}>{error || 'Chapter not found'}</p>
        <Link href={`/projects/${projectId}`} style={styles.backLink}>
          ← Back to Project
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link
            href="/projects"
            style={styles.logoLink}
          >
            <div style={styles.logo}>N</div>
          </Link>
          <div style={styles.breadcrumbs}>
            <Link href={`/projects/${projectId}`} style={styles.breadcrumb}>
              {book?.title || 'Project'}
            </Link>
            <span style={styles.breadcrumbSeparator}>/</span>
            <span style={styles.breadcrumbCurrent}>
              Chapter {chapter.chapter_number}
              {chapter.title && `: ${chapter.title}`}
            </span>
          </div>
        </div>
        <Link href={`/projects/${projectId}`} style={styles.closeButton}>
          ✕
        </Link>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          <ChapterEditor
            chapterId={chapterId}
            onClose={() => router.push(`/projects/${projectId}`)}
          />
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    color: '#64748B',
    fontSize: '16px',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: '2rem',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: '1rem',
  },
  errorText: {
    fontSize: '16px',
    color: '#64748B',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  backLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  logoLink: {
    textDecoration: 'none',
  },
  logo: {
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
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '14px',
  },
  breadcrumb: {
    color: '#64748B',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    color: '#CBD5E1',
  },
  breadcrumbCurrent: {
    color: '#1A1A2E',
    fontWeight: '500',
  },
  closeButton: {
    fontSize: '24px',
    color: '#64748B',
    textDecoration: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
  mainContent: {
    flex: 1,
    overflow: 'auto',
  },
  contentWrapper: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
};
