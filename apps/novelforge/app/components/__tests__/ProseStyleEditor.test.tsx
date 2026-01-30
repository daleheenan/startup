import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProseStyleEditor from '../ProseStyleEditor';

const mockPresets = [
  {
    id: 'preset-1',
    preset_name: 'Literary Fiction',
    description: 'Sophisticated prose with complex sentences',
    genre: 'literary',
    subgenre: null,
  },
  {
    id: 'preset-2',
    preset_name: 'Young Adult',
    description: 'Accessible prose for teenage readers',
    genre: 'young-adult',
    subgenre: null,
  },
];

describe('ProseStyleEditor', () => {
  const mockOnStyleChange = vi.fn();
  const projectId = 'test-project-123';

  beforeEach(() => {
    mockOnStyleChange.mockClear();
    global.fetch = vi.fn();
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render component with title and description', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Prose Style Editor')).toBeInTheDocument();
      expect(
        screen.getByText('Fine-tune your writing style with visual controls')
      ).toBeInTheDocument();
    });

    it('should render style name input', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      const input = screen.getByLabelText('Style Name');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Custom Style');
    });

    it('should load existing style when currentStyleId provided', async () => {
      const mockStyle = {
        id: 'style-1',
        name: 'My Custom Style',
        project_id: projectId,
        sentence_length_preference: 'short' as const,
        sentence_complexity: 'moderate' as const,
        sentence_variety_score: 0.7,
        target_reading_level: 'general' as const,
        flesch_kincaid_target: 70.0,
        formality_level: 'moderate' as const,
        voice_tone: 'neutral' as const,
        narrative_distance: 'close' as const,
        vocabulary_complexity: 'moderate' as const,
        use_metaphors: true,
        use_similes: true,
        default_pacing: 'moderate' as const,
        scene_transition_style: 'smooth' as const,
        paragraph_length_preference: 'varied' as const,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style: mockStyle }),
      });

      render(<ProseStyleEditor projectId={projectId} currentStyleId="style-1" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/prose-styles/style-1');
      });
    });

    it('should load presets on mount', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ presets: mockPresets }),
      });

      render(<ProseStyleEditor projectId={projectId} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/prose-styles/presets/all');
      });
    });
  });

  describe('Style Name Input', () => {
    it('should update style name on input', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      const input = screen.getByLabelText('Style Name');
      await user.clear(input);
      await user.type(input, 'My Awesome Style');

      expect(input).toHaveValue('My Awesome Style');
    });
  });

  describe('Preset Selection', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ presets: mockPresets }),
      });
    });

    it('should toggle preset visibility when button clicked', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      const toggleButton = screen.getByText('Show Genre Presets');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Literary Fiction')).toBeInTheDocument();
      });

      expect(toggleButton).toHaveTextContent('Hide Genre Presets');
    });

    it('should display all presets when shown', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Show Genre Presets'));

      await waitFor(() => {
        expect(screen.getByText('Literary Fiction')).toBeInTheDocument();
        expect(screen.getByText('Young Adult')).toBeInTheDocument();
        expect(
          screen.getByText('Sophisticated prose with complex sentences')
        ).toBeInTheDocument();
      });
    });

    it('should apply preset when clicked', async () => {
      const user = userEvent.setup();
      const appliedStyle = {
        id: 'new-style-1',
        name: 'Literary Fiction',
        sentence_complexity: 'complex',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presets: mockPresets }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ style: appliedStyle }),
        });

      render(<ProseStyleEditor projectId={projectId} onStyleChange={mockOnStyleChange} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Show Genre Presets'));

      await waitFor(() => {
        expect(screen.getByText('Literary Fiction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Literary Fiction'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/prose-styles/presets/preset-1/apply',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ project_id: projectId, name: 'Literary Fiction' }),
          })
        );
      });

      expect(mockOnStyleChange).toHaveBeenCalledWith(appliedStyle);
    });
  });

  describe('Sentence Structure Controls', () => {
    it('should render sentence length dropdown', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Sentence Length')).toBeInTheDocument();
      const select = screen.getByDisplayValue('Varied (dynamic rhythm)');
      expect(select).toBeInTheDocument();
    });

    it('should update sentence length preference', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      const select = screen.getByDisplayValue('Varied (dynamic rhythm)');
      await user.selectOptions(select, 'short');

      expect(select).toHaveValue('short');
    });

    it('should render sentence complexity dropdown', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Sentence Complexity')).toBeInTheDocument();
    });

    it('should render variety score slider', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText(/Variety Score: 0.70/)).toBeInTheDocument();
      const slider = screen.getByRole('slider', { name: /variety score/i });
      expect(slider).toHaveValue('0.7');
    });

    it('should update variety score on slider change', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      const slider = screen.getByRole('slider', { name: /variety score/i }) as HTMLInputElement;

      // For range inputs, use fireEvent.change to update the value
      fireEvent.change(slider, { target: { value: '0.9' } });

      expect(screen.getByText(/Variety Score: 0.90/)).toBeInTheDocument();
    });
  });

  describe('Readability Controls', () => {
    it('should render target reading level dropdown', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Target Reading Level')).toBeInTheDocument();
      const select = screen.getByDisplayValue('General Adult (standard)');
      expect(select).toBeInTheDocument();
    });

    it('should render Flesch reading ease slider', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText(/Flesch Reading Ease: 70/)).toBeInTheDocument();
    });

    it('should update reading level', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      const select = screen.getByDisplayValue('General Adult (standard)');
      await user.selectOptions(select, 'literary');

      expect(select).toHaveValue('literary');
    });
  });

  describe('Voice and Tone Controls', () => {
    it('should render formality level dropdown', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Formality Level')).toBeInTheDocument();
    });

    it('should render voice tone dropdown', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Voice Tone')).toBeInTheDocument();
      const select = screen.getByDisplayValue('Neutral');
      expect(select).toBeInTheDocument();
    });

    it('should render narrative distance dropdown', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Narrative Distance')).toBeInTheDocument();
    });

    it('should update voice tone', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      const select = screen.getByDisplayValue('Neutral');
      await user.selectOptions(select, 'intimate');

      expect(select).toHaveValue('intimate');
    });
  });

  describe('Voice Sample Analyser', () => {
    it('should render voice sample section', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Voice Sample Analyser')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Paste a paragraph or two of your writing here...')
      ).toBeInTheDocument();
    });

    it('should enable Analyse button when text is entered', async () => {
      const user = userEvent.setup();

      render(<ProseStyleEditor projectId={projectId} />);

      const textarea = screen.getByPlaceholderText(
        'Paste a paragraph or two of your writing here...'
      );
      const analyseButton = screen.getByText('Analyse Sample');

      expect(analyseButton).toBeDisabled();

      await user.type(textarea, 'This is a sample of my writing.');

      expect(analyseButton).not.toBeDisabled();
    });

    it('should disable button when there is no text', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      const analyseButton = screen.getByText('Analyse Sample');

      // Button should be disabled when there's no text
      expect(analyseButton).toBeDisabled();
    });

    it('should analyse voice sample when button clicked', async () => {
      const user = userEvent.setup();
      const mockSample = { flesch_kincaid_score: 65.0 };
      const mockStyle = {
        id: 'style-1',
        name: 'Custom Style',
        project_id: projectId,
        sentence_length_preference: 'varied',
        sentence_complexity: 'moderate',
        sentence_variety_score: 0.7,
        target_reading_level: 'general',
        flesch_kincaid_target: 70.0,
        formality_level: 'moderate',
        voice_tone: 'neutral',
        narrative_distance: 'close',
        vocabulary_complexity: 'moderate',
        use_metaphors: true,
        use_similes: true,
        default_pacing: 'moderate',
        scene_transition_style: 'smooth',
        paragraph_length_preference: 'varied',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ style: mockStyle }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sample: mockSample }),
        });

      render(<ProseStyleEditor projectId={projectId} />);

      const textarea = screen.getByPlaceholderText(
        'Paste a paragraph or two of your writing here...'
      );
      await user.type(textarea, 'This is a sample of my writing.');

      const analyseButton = screen.getByText('Analyse Sample');
      await user.click(analyseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/voice-samples'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should show Analysing state', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ style: { id: 'style-1' } }),
                }),
              100
            )
          )
      );

      render(<ProseStyleEditor projectId={projectId} />);

      const textarea = screen.getByPlaceholderText(
        'Paste a paragraph or two of your writing here...'
      );
      await user.type(textarea, 'Sample text');

      const analyseButton = screen.getByText('Analyse Sample');
      await user.click(analyseButton);

      expect(screen.getByText('Analysing...')).toBeInTheDocument();
      expect(screen.getByText('Analysing...')).toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('should save style when Save button clicked', async () => {
      const user = userEvent.setup();
      const savedStyle = {
        id: 'new-style-1',
        name: 'Custom Style',
        project_id: projectId,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ style: savedStyle, presets: [] }),
      });

      render(<ProseStyleEditor projectId={projectId} onStyleChange={mockOnStyleChange} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Style');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/prose-styles',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      expect(mockOnStyleChange).toHaveBeenCalledWith(savedStyle);
    });

    it('should use PUT method for existing styles', async () => {
      const user = userEvent.setup();
      const existingStyle = {
        id: 'style-123',
        name: 'Existing Style',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ style: existingStyle }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presets: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ style: existingStyle }),
        });

      render(<ProseStyleEditor projectId={projectId} currentStyleId="style-123" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Style');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/prose-styles/style-123',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });

    it('should show success alert on successful save', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ style: { id: 'new-1' }, presets: [] }),
      });

      render(<ProseStyleEditor projectId={projectId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Style saved successfully!');
      });
    });

    it('should show error alert on failed save', async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presets: [] }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<ProseStyleEditor projectId={projectId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to save style');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form controls', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByLabelText('Style Name')).toBeInTheDocument();
      expect(screen.getByText('Sentence Length')).toBeInTheDocument();
      expect(screen.getByText('Sentence Complexity')).toBeInTheDocument();
      expect(screen.getByText('Target Reading Level')).toBeInTheDocument();
      expect(screen.getByText('Formality Level')).toBeInTheDocument();
      expect(screen.getByText('Voice Tone')).toBeInTheDocument();
      expect(screen.getByText('Narrative Distance')).toBeInTheDocument();
    });

    it('should have descriptive help text for controls', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByText('Higher = more varied sentence structures')).toBeInTheDocument();
      expect(
        screen.getByText('Paste a sample of your writing to analyse its style patterns')
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle preset loading errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<ProseStyleEditor projectId={projectId} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Component should still render
      expect(screen.getByText('Prose Style Editor')).toBeInTheDocument();
    });

    it('should handle style loading errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Not found'));

      render(<ProseStyleEditor projectId={projectId} currentStyleId="nonexistent" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Component should still render with defaults
      expect(screen.getByText('Prose Style Editor')).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should initialise with correct default values', () => {
      render(<ProseStyleEditor projectId={projectId} />);

      expect(screen.getByDisplayValue('Custom Style')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Varied (dynamic rhythm)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Moderate (some complexity)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('General Adult (standard)')).toBeInTheDocument();
    });
  });
});
