'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileUpload from '../components/FileUpload';
import TextPaste from '../components/TextPaste';
import { isAuthenticated } from '../lib/auth';
import { submitRawText } from '../lib/api';

export default function AnalysePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [title, setTitle] = useState('');
  const [analysisType, setAnalysisType] = useState<'full' | 'quick' | 'comparison'>('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let content = '';
      if (activeTab === 'paste') {
        if (!pastedText.trim()) {
          throw new Error('Please paste some text to analyse');
        }
        content = pastedText;
      } else {
        if (!selectedFile) {
          throw new Error('Please select a file to upload');
        }
        // For now, we only support text paste. File upload would need backend support
        throw new Error('File upload coming soon. Please use text paste for now.');
      }

      const result = await submitRawText(
        title || 'Untitled Manuscript',
        content,
        analysisType
      );

      // Redirect to results page
      router.push(`/results/${result.analysisId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Analyse Your Story</h1>

          {error && (
            <div className="card bg-red-500/10 border-red-500/30 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label htmlFor="title" className="label">
                Story Title (optional)
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="My Amazing Novel"
              />
            </div>

            {/* Analysis Type */}
            <div>
              <label className="label">Analysis Type</label>
              <div className="grid grid-cols-3 gap-4">
                {(['full', 'quick', 'comparison'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAnalysisType(type)}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      analysisType === type
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-slate-600 bg-background-surface hover:border-primary-500/50'
                    }`}
                  >
                    <div className="font-semibold capitalize">{type}</div>
                    <div className="text-xs text-text-muted mt-1">
                      {type === 'full' && '~5 min'}
                      {type === 'quick' && '~30 sec'}
                      {type === 'comparison' && '~2 min'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div>
              <div className="flex space-x-4 border-b border-slate-700 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`pb-3 px-4 font-medium transition-colors ${
                    activeTab === 'paste'
                      ? 'text-primary-400 border-b-2 border-primary-500'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-3 px-4 font-medium transition-colors ${
                    activeTab === 'upload'
                      ? 'text-primary-400 border-b-2 border-primary-500'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  Upload File
                </button>
              </div>

              {activeTab === 'paste' ? (
                <TextPaste onTextChange={setPastedText} />
              ) : (
                <FileUpload onFileSelect={setSelectedFile} />
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Start Analysis'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
