'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AnalyticsDashboard from '../../../components/AnalyticsDashboard';
import { getToken, logout } from '../../../lib/auth';

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

  useEffect(() => {
    if (projectId) {
      fetchBooks();
    }
  }, [projectId]);

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
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Navigation */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #ddd',
        padding: '16px 24px',
        marginBottom: '24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

          {/* Book Selector */}
          {books.length > 1 && (
            <select
              value={selectedBookId || ''}
              onChange={(e) => setSelectedBookId(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
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
        </div>
      </nav>

      {/* Main Content */}
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
  );
}
