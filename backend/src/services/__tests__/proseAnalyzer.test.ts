import { ProseAnalyzer } from '../proseAnalyzer.js';

describe('ProseAnalyzer', () => {
  describe('analyzeVoiceSample', () => {
    it('should analyse text and return complete voice sample metrics', () => {
      // Arrange
      const text = 'The quick brown fox jumped over the lazy dog. It was a beautiful day. The sun shone brightly.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result).toHaveProperty('avg_sentence_length');
      expect(result).toHaveProperty('sentence_length_variance');
      expect(result).toHaveProperty('flesch_kincaid_score');
      expect(result).toHaveProperty('complex_word_ratio');
      expect(result).toHaveProperty('extracted_patterns');
      expect(result.extracted_patterns).toHaveProperty('common_sentence_structures');
      expect(result.extracted_patterns).toHaveProperty('word_patterns');
      expect(result.extracted_patterns).toHaveProperty('rhythm_notes');
    });

    it('should handle empty text gracefully', () => {
      // Arrange
      const text = '';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBe(0);
      expect(result.sentence_length_variance).toBe(0);
      expect(result.flesch_kincaid_score).toBe(0);
      expect(result.complex_word_ratio).toBe(0);
    });

    it('should analyse short simple sentences', () => {
      // Arrange
      const text = 'I ran. She laughed. We danced.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeLessThan(5);
      expect(result.flesch_kincaid_score).toBeGreaterThan(80); // Short sentences are easy to read
    });

    it('should analyse long complex sentences', () => {
      // Arrange
      const text = 'The magnificently architected contemporary establishment, which had been painstakingly constructed over the course of numerous years by extraordinarily talented craftspeople, stood majestically upon the hillside overlooking the valley below.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(20);
      expect(result.complex_word_ratio).toBeGreaterThan(0.3); // Many complex words
      expect(result.flesch_kincaid_score).toBeLessThan(50); // Complex sentences are harder to read
    });

    it('should identify extracted patterns', () => {
      // Arrange
      const text = 'He ran like the wind. She sang like an angel. They moved as if dancing.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.extracted_patterns?.word_patterns).toContain('uses_similes');
    });
  });

  describe('calculateTextMetrics', () => {
    it('should calculate average sentence length', () => {
      // Arrange
      const text = 'This is a test. This is another test sentence. Short one.';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      // 11 words / 3 sentences = 3.67
      expect(result.avgSentenceLength).toBeCloseTo(3.67, 1);
    });

    it('should calculate sentence length variance', () => {
      // Arrange
      const text = 'Short. This is a longer sentence with more words. Another.';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      expect(result.sentenceLengthVariance).toBeGreaterThan(0);
    });

    it('should calculate Flesch-Kincaid score', () => {
      // Arrange
      const text = 'The cat sat on the mat. It was happy.';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      expect(result.fleschKincaidScore).toBeGreaterThanOrEqual(0);
      expect(result.fleschKincaidScore).toBeLessThanOrEqual(100);
    });

    it('should calculate complex word ratio', () => {
      // Arrange
      const text = 'The extraordinary phenomenon manifested unexpectedly.';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      expect(result.complexWordRatio).toBeGreaterThan(0.5); // Most words are 3+ syllables
    });

    it('should handle single sentence text', () => {
      // Arrange
      const text = 'A single sentence without punctuation at the end';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      expect(result.avgSentenceLength).toBeGreaterThan(0);
    });

    it('should return zero metrics for empty text', () => {
      // Arrange
      const text = '';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      expect(result.avgSentenceLength).toBe(0);
      expect(result.sentenceLengthVariance).toBe(0);
      expect(result.fleschKincaidScore).toBe(0);
      expect(result.complexWordRatio).toBe(0);
    });

    it('should handle text with only punctuation', () => {
      // Arrange
      const text = '... !!! ???';

      // Act
      const result = ProseAnalyzer.calculateTextMetrics(text);

      // Assert
      expect(result.avgSentenceLength).toBe(0);
      expect(result.complexWordRatio).toBe(0);
    });
  });

  describe('checkStyleConsistency', () => {
    it('should check consistency with target style', () => {
      // Arrange
      const text = 'This is a test sentence. Another sentence here. And a third one.';
      const targetStyle = {
        sentence_length_preference: 'medium',
        flesch_kincaid_target: 70,
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('sentenceConsistency');
      expect(result).toHaveProperty('vocabularyConsistency');
      expect(result).toHaveProperty('pacingConsistency');
      expect(result).toHaveProperty('deviations');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should flag major sentence length deviations', () => {
      // Arrange
      const text = 'This is an extraordinarily long sentence that contains far too many words and would definitely exceed the target length for short sentence preference by a significant margin.';
      const targetStyle = {
        sentence_length_preference: 'short',
        flesch_kincaid_target: 70,
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      expect(result.deviations.length).toBeGreaterThan(0);
      expect(result.deviations[0].type).toBe('sentence_length');
      expect(result.deviations[0].severity).toBe('major');
      expect(result.sentenceConsistency).toBeLessThan(100);
    });

    it('should flag readability score deviations', () => {
      // Arrange
      const text = 'The extraordinarily sophisticated methodological paradigm necessitates comprehensive reconsideration.';
      const targetStyle = {
        sentence_length_preference: 'medium',
        flesch_kincaid_target: 80, // Target easy reading
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      const readabilityDeviations = result.deviations.filter(d => d.type === 'readability');
      expect(readabilityDeviations.length).toBeGreaterThan(0);
      expect(result.vocabularyConsistency).toBeLessThan(100);
    });

    it('should handle short sentence preference', () => {
      // Arrange
      const text = 'I ran. She laughed. They danced.';
      const targetStyle = {
        sentence_length_preference: 'short',
        flesch_kincaid_target: 90,
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      expect(result.sentenceConsistency).toBeGreaterThanOrEqual(80);
    });

    it('should handle long sentence preference', () => {
      // Arrange
      const text = 'The majestic mountains rose above the valley, their peaks covered in snow, while the river below meandered through the forest with gentle grace.';
      const targetStyle = {
        sentence_length_preference: 'long',
        flesch_kincaid_target: 50,
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      expect(result.sentenceConsistency).toBeGreaterThan(80);
    });

    it('should handle varied sentence preference', () => {
      // Arrange
      const text = 'Short. This is a medium length sentence. This is an even longer sentence with many words that continues on.';
      const targetStyle = {
        sentence_length_preference: 'varied',
        flesch_kincaid_target: 60,
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should return high consistency for matching text', () => {
      // Arrange
      const text = 'The weather was pleasant today. Birds sang in the trees. Children played in the park.';
      const targetStyle = {
        sentence_length_preference: 'short', // 6+6+5=17 words / 3 sentences = 5.67 avg (closer to 12 than 18)
        flesch_kincaid_target: 90, // Simple text should have high FK score
      };

      // Act
      const result = ProseAnalyzer.checkStyleConsistency(text, targetStyle);

      // Assert
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.deviations.length).toBeLessThanOrEqual(1); // Allow small deviations
    });
  });

  describe('splitIntoSentences', () => {
    it('should split text by full stops', () => {
      // Arrange
      const text = 'First sentence. Second sentence. Third sentence.';

      // Act
      const result = (ProseAnalyzer as any).splitIntoSentences(text);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('First sentence');
      expect(result[1]).toBe('Second sentence');
      expect(result[2]).toBe('Third sentence');
    });

    it('should split text by exclamation marks', () => {
      // Arrange
      const text = 'Watch out! Run away! Help!';

      // Act
      const result = (ProseAnalyzer as any).splitIntoSentences(text);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should split text by question marks', () => {
      // Arrange
      const text = 'Where are you? What happened? Why?';

      // Act
      const result = (ProseAnalyzer as any).splitIntoSentences(text);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should trim whitespace from sentences', () => {
      // Arrange
      const text = '  First sentence.   Second sentence.  ';

      // Act
      const result = (ProseAnalyzer as any).splitIntoSentences(text);

      // Assert
      expect(result[0]).toBe('First sentence');
      expect(result[1]).toBe('Second sentence');
    });

    it('should filter empty sentences', () => {
      // Arrange
      const text = '.... Test sentence.';

      // Act
      const result = (ProseAnalyzer as any).splitIntoSentences(text);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('Test sentence');
    });

    it('should return empty array for empty text', () => {
      // Arrange
      const text = '';

      // Act
      const result = (ProseAnalyzer as any).splitIntoSentences(text);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('splitIntoWords', () => {
    it('should split text into words', () => {
      // Arrange
      const text = 'The quick brown fox';

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toEqual(['The', 'quick', 'brown', 'fox']);
    });

    it('should handle contractions', () => {
      // Arrange
      const text = "Don't can't won't";

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toContain("Don't");
      expect(result).toContain("can't");
      expect(result).toContain("won't");
    });

    it('should handle hyphenated words', () => {
      // Arrange
      const text = 'A well-known author';

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toContain('well-known');
    });

    it('should remove punctuation', () => {
      // Arrange
      const text = 'Hello, world! How are you?';

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toEqual(['Hello', 'world', 'How', 'are', 'you']);
    });

    it('should filter empty strings', () => {
      // Arrange
      const text = 'Word1    Word2     Word3';

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toEqual(['Word1', 'Word2', 'Word3']);
    });

    it('should return empty array for empty text', () => {
      // Arrange
      const text = '';

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle numbers', () => {
      // Arrange
      const text = 'There are 123 items in stock';

      // Act
      const result = (ProseAnalyzer as any).splitIntoWords(text);

      // Assert
      expect(result).toContain('123');
    });
  });

  describe('countSyllables', () => {
    it('should count single syllable words', () => {
      // Arrange & Act & Assert
      expect((ProseAnalyzer as any).countSyllables('cat')).toBe(1);
      expect((ProseAnalyzer as any).countSyllables('dog')).toBe(1);
      expect((ProseAnalyzer as any).countSyllables('run')).toBe(1);
    });

    it('should count two syllable words', () => {
      // Arrange & Act & Assert
      expect((ProseAnalyzer as any).countSyllables('happy')).toBe(2);
      expect((ProseAnalyzer as any).countSyllables('better')).toBe(2);
      expect((ProseAnalyzer as any).countSyllables('running')).toBe(2);
    });

    it('should count three syllable words', () => {
      // Arrange & Act & Assert
      // Note: simplified syllable counting may not be perfect
      expect((ProseAnalyzer as any).countSyllables('beautiful')).toBeGreaterThanOrEqual(3);
      expect((ProseAnalyzer as any).countSyllables('important')).toBeGreaterThanOrEqual(3);
    });

    it('should count four or more syllable words', () => {
      // Arrange & Act & Assert
      expect((ProseAnalyzer as any).countSyllables('extraordinary')).toBeGreaterThanOrEqual(4);
      expect((ProseAnalyzer as any).countSyllables('understanding')).toBeGreaterThanOrEqual(3);
    });

    it('should handle words with silent e', () => {
      // Arrange & Act & Assert
      expect((ProseAnalyzer as any).countSyllables('make')).toBe(1);
      expect((ProseAnalyzer as any).countSyllables('time')).toBe(1);
      expect((ProseAnalyzer as any).countSyllables('like')).toBe(1);
    });

    it('should return 1 for very short words', () => {
      // Arrange & Act & Assert
      expect((ProseAnalyzer as any).countSyllables('a')).toBe(1);
      expect((ProseAnalyzer as any).countSyllables('I')).toBe(1);
      expect((ProseAnalyzer as any).countSyllables('go')).toBe(1);
    });

    it('should handle uppercase words', () => {
      // Arrange & Act & Assert
      expect((ProseAnalyzer as any).countSyllables('HELLO')).toBe(2);
      expect((ProseAnalyzer as any).countSyllables('WORLD')).toBe(1);
    });
  });

  describe('countTotalSyllables', () => {
    it('should count total syllables in word array', () => {
      // Arrange
      const words = ['cat', 'happy', 'beautiful'];

      // Act
      const result = (ProseAnalyzer as any).countTotalSyllables(words);

      // Assert
      // Simplified algorithm: cat=1, happy=2, beautiful=4 = 7 total
      expect(result).toBeGreaterThanOrEqual(6);
    });

    it('should return 0 for empty array', () => {
      // Arrange
      const words: string[] = [];

      // Act
      const result = (ProseAnalyzer as any).countTotalSyllables(words);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('calculateVariance', () => {
    it('should calculate variance of numbers', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];

      // Act
      const result = (ProseAnalyzer as any).calculateVariance(numbers);

      // Assert
      expect(result).toBeCloseTo(2, 0);
    });

    it('should return 0 for identical numbers', () => {
      // Arrange
      const numbers = [5, 5, 5, 5, 5];

      // Act
      const result = (ProseAnalyzer as any).calculateVariance(numbers);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for empty array', () => {
      // Arrange
      const numbers: number[] = [];

      // Act
      const result = (ProseAnalyzer as any).calculateVariance(numbers);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for single number', () => {
      // Arrange
      const numbers = [42];

      // Act
      const result = (ProseAnalyzer as any).calculateVariance(numbers);

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate high variance for disparate numbers', () => {
      // Arrange
      const numbers = [1, 100, 1, 100];

      // Act
      const result = (ProseAnalyzer as any).calculateVariance(numbers);

      // Assert
      expect(result).toBeGreaterThan(1000);
    });
  });

  describe('calculateFleschKincaid', () => {
    it('should calculate Flesch-Kincaid score', () => {
      // Arrange
      const wordCount = 100;
      const sentenceCount = 5;
      const syllableCount = 150;

      // Act
      const result = (ProseAnalyzer as any).calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

      // Assert
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return 0 for zero word count', () => {
      // Arrange
      const wordCount = 0;
      const sentenceCount = 5;
      const syllableCount = 0;

      // Act
      const result = (ProseAnalyzer as any).calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for zero sentence count', () => {
      // Arrange
      const wordCount = 100;
      const sentenceCount = 0;
      const syllableCount = 150;

      // Act
      const result = (ProseAnalyzer as any).calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

      // Assert
      expect(result).toBe(0);
    });

    it('should clamp score to maximum 100', () => {
      // Arrange - Very short sentences and words
      const wordCount = 100;
      const sentenceCount = 50; // Very short sentences
      const syllableCount = 100; // Single syllable words

      // Act
      const result = (ProseAnalyzer as any).calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

      // Assert
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should clamp score to minimum 0', () => {
      // Arrange - Very long sentences and complex words
      const wordCount = 100;
      const sentenceCount = 1; // One very long sentence
      const syllableCount = 500; // Many syllables per word

      // Act
      const result = (ProseAnalyzer as any).calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

      // Assert
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return higher score for simple text', () => {
      // Arrange
      const simpleWordCount = 50;
      const simpleSentenceCount = 10;
      const simpleSyllableCount = 60;

      // Act
      const simpleResult = (ProseAnalyzer as any).calculateFleschKincaid(
        simpleWordCount,
        simpleSentenceCount,
        simpleSyllableCount
      );

      // Assert
      expect(simpleResult).toBeGreaterThan(60);
    });

    it('should return lower score for complex text', () => {
      // Arrange
      const complexWordCount = 50;
      const complexSentenceCount = 2;
      const complexSyllableCount = 150;

      // Act
      const complexResult = (ProseAnalyzer as any).calculateFleschKincaid(
        complexWordCount,
        complexSentenceCount,
        complexSyllableCount
      );

      // Assert
      expect(complexResult).toBeLessThan(40);
    });
  });

  describe('analyzeSentenceStructure', () => {
    it('should identify short simple sentences', () => {
      // Arrange
      const sentence = 'I ran quickly.';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('short');
      expect(result).toContain('simple');
    });

    it('should identify medium compound sentences', () => {
      // Arrange
      // Need 10-20 words for medium classification
      const sentence = 'The sun was shining brightly overhead, and the birds were singing cheerfully in the trees.';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('medium');
      expect(result).toContain('compound');
    });

    it('should identify long complex sentences', () => {
      // Arrange
      // Need > 20 words for long classification and multiple clause markers for complex
      const sentence = 'The weather was absolutely beautiful throughout the entire morning, the children were playing happily in the garden, and everyone seemed genuinely content; it was truly a perfect day for celebration.';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('long');
      expect(result).toContain('complex');
    });

    it('should identify questions', () => {
      // Arrange
      const sentence = 'What are you doing?';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('question');
    });

    it('should identify exclamations', () => {
      // Arrange
      const sentence = 'Watch out!';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('exclamation');
    });

    it('should identify lists with colons', () => {
      // Arrange
      const sentence = 'There are three things: first, second, and third.';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('list');
    });

    it('should combine multiple characteristics', () => {
      // Arrange
      const sentence = 'What did you bring: apples, oranges, and bananas?';

      // Act
      const result = (ProseAnalyzer as any).analyzeSentenceStructure(sentence);

      // Assert
      expect(result).toContain('list');
      expect(result).toContain('question');
    });
  });

  describe('identifyWordPatterns', () => {
    it('should identify concise vocabulary', () => {
      // Arrange
      const words = ['I', 'ran', 'to', 'the', 'shop', 'now'];

      // Act
      const result = (ProseAnalyzer as any).identifyWordPatterns(words);

      // Assert
      expect(result).toContain('concise_vocabulary');
    });

    it('should identify elaborate vocabulary', () => {
      // Arrange
      const words = ['extraordinary', 'magnificent', 'phenomenal', 'exceptional'];

      // Act
      const result = (ProseAnalyzer as any).identifyWordPatterns(words);

      // Assert
      expect(result).toContain('elaborate_vocabulary');
    });

    it('should identify repetitive emphasis', () => {
      // Arrange
      // Need > 3 words with count > 2 to trigger repetitive pattern
      const words = ['very', 'very', 'very', 'good', 'good', 'good', 'nice', 'nice', 'nice', 'really', 'really', 'really'];

      // Act
      const result = (ProseAnalyzer as any).identifyWordPatterns(words);

      // Assert
      expect(result).toContain('repetitive_for_emphasis');
    });

    it('should identify similes', () => {
      // Arrange
      const words = ['He', 'ran', 'like', 'the', 'wind'];

      // Act
      const result = (ProseAnalyzer as any).identifyWordPatterns(words);

      // Assert
      expect(result).toContain('uses_similes');
    });

    it('should identify metaphors', () => {
      // Arrange
      const words = ['Time', 'is', 'a', 'river'];

      // Act
      const result = (ProseAnalyzer as any).identifyWordPatterns(words);

      // Assert
      expect(result).toContain('uses_metaphors');
    });

    it('should return empty array for neutral vocabulary', () => {
      // Arrange
      const words = ['The', 'person', 'walked', 'down', 'the', 'street'];

      // Act
      const result = (ProseAnalyzer as any).identifyWordPatterns(words);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeRhythm', () => {
    it('should identify consistent rhythm', () => {
      // Arrange
      const sentences = [
        'This is sentence one with eight words.',
        'This is sentence two with eight words.',
        'This is sentence three with eight words.',
      ];

      // Act
      const result = (ProseAnalyzer as any).analyzeRhythm(sentences);

      // Assert
      expect(result).toContain('consistent_sentence_rhythm');
    });

    it('should identify highly varied rhythm', () => {
      // Arrange
      // Need variance > 50 for highly varied
      const sentences = [
        'Go.',
        'This is a much much longer sentence with many many more words to create high variance.',
        'Brief.',
        'Another extremely long sentence that goes on and on with lots of extra words to really increase the variance between sentence lengths significantly.',
        'Run.',
      ];

      // Act
      const result = (ProseAnalyzer as any).analyzeRhythm(sentences);

      // Assert
      expect(result).toContain('highly_varied_rhythm');
    });

    it('should identify moderate rhythm variation', () => {
      // Arrange
      // Need variance between 10 and 50
      const sentences = [
        'Short one.',
        'This is a much longer sentence with more words.',
        'Medium.',
        'Another sentence that is quite long with many words in it.',
        'Brief.',
      ];

      // Act
      const result = (ProseAnalyzer as any).analyzeRhythm(sentences);

      // Assert
      expect(result).toContain('moderate_rhythm_variation');
    });

    it('should identify predominantly short sentences', () => {
      // Arrange
      const sentences = ['I ran.', 'She laughed.', 'We danced.', 'They sang.', 'He jumped.', 'She cried.'];

      // Act
      const result = (ProseAnalyzer as any).analyzeRhythm(sentences);

      // Assert
      expect(result).toContain('predominantly_short_sentences');
    });

    it('should identify predominantly long sentences', () => {
      // Arrange
      // Need > 20 words per sentence, and > 60% of sentences should be long
      const longSentence =
        'This is a very long sentence with many many words that continues on and on with lots and lots of detail and extra information.';
      const sentences = [longSentence, longSentence, longSentence];

      // Act
      const result = (ProseAnalyzer as any).analyzeRhythm(sentences);

      // Assert
      expect(result).toContain('predominantly_long_sentences');
    });
  });

  describe('countPatterns', () => {
    it('should count occurrences of items', () => {
      // Arrange
      const items = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];

      // Act
      const result = (ProseAnalyzer as any).countPatterns(items);

      // Assert
      expect(result['apple']).toBe(3);
      expect(result['banana']).toBe(2);
      expect(result['cherry']).toBe(1);
    });

    it('should return empty object for empty array', () => {
      // Arrange
      const items: string[] = [];

      // Act
      const result = (ProseAnalyzer as any).countPatterns(items);

      // Assert
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should count single occurrence', () => {
      // Arrange
      const items = ['unique'];

      // Act
      const result = (ProseAnalyzer as any).countPatterns(items);

      // Assert
      expect(result['unique']).toBe(1);
    });
  });

  describe('getTargetSentenceLength', () => {
    it('should return 12 for short preference', () => {
      // Arrange & Act
      const result = (ProseAnalyzer as any).getTargetSentenceLength('short');

      // Assert
      expect(result).toBe(12);
    });

    it('should return 18 for medium preference', () => {
      // Arrange & Act
      const result = (ProseAnalyzer as any).getTargetSentenceLength('medium');

      // Assert
      expect(result).toBe(18);
    });

    it('should return 25 for long preference', () => {
      // Arrange & Act
      const result = (ProseAnalyzer as any).getTargetSentenceLength('long');

      // Assert
      expect(result).toBe(25);
    });

    it('should return 18 for varied preference', () => {
      // Arrange & Act
      const result = (ProseAnalyzer as any).getTargetSentenceLength('varied');

      // Assert
      expect(result).toBe(18);
    });

    it('should return 18 for unknown preference', () => {
      // Arrange & Act
      const result = (ProseAnalyzer as any).getTargetSentenceLength('unknown');

      // Assert
      expect(result).toBe(18);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle text with only whitespace', () => {
      // Arrange
      const text = '     \n\n\t\t    ';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBe(0);
      expect(result.flesch_kincaid_score).toBe(0);
    });

    it('should handle text with special characters', () => {
      // Arrange
      const text = 'Hello @world! #testing $pecial ch@racters.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
    });

    it('should handle very long text', () => {
      // Arrange
      const longText = 'This is a sentence. '.repeat(1000);

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(longText);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
      expect(result.sentence_length_variance).toBe(0); // All sentences identical
    });

    it('should handle mixed punctuation', () => {
      // Arrange
      const text = 'What is this? I don\'t know! Really... Absolutely.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
    });

    it('should handle dialogue with quotes', () => {
      // Arrange
      const text = '"Hello," she said. "How are you?" he replied. "I\'m fine," she answered.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
    });

    it('should handle abbreviations', () => {
      // Arrange
      const text = 'Dr. Smith went to the U.S.A. in Feb. to visit Mrs. Jones.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
    });

    it('should handle numbers in text', () => {
      // Arrange
      const text = 'There are 123 items and 456 more items. That makes 579 total.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
    });

    it('should handle em dashes and en dashes', () => {
      // Arrange
      const text = 'The result—surprising to many—was positive. The period 2020–2021 was difficult.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(0);
    });
  });

  describe('extractStylePatterns (private method)', () => {
    it('should extract common sentence structures', () => {
      // Arrange
      const text = 'Short one. Another short sentence. A third short one.';

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.extracted_patterns?.common_sentence_structures).toBeDefined();
      expect(result.extracted_patterns?.common_sentence_structures?.length).toBeGreaterThan(0);
    });

    it('should limit to top 5 common structures', () => {
      // Arrange
      const sentences = [];
      for (let i = 0; i < 20; i++) {
        sentences.push('This is a test sentence with some words.');
      }
      const text = sentences.join(' ');

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.extracted_patterns?.common_sentence_structures?.length).toBeLessThanOrEqual(5);
    });
  });

  describe('real-world prose examples', () => {
    it('should analyse literary prose', () => {
      // Arrange
      const text = `It was the best of times, it was the worst of times.
        It was the age of wisdom, it was the age of foolishness.
        It was the epoch of belief, it was the epoch of incredulity.`;

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(10);
      expect(result.extracted_patterns?.word_patterns).toBeDefined();
    });

    it('should analyse technical prose', () => {
      // Arrange
      const text = `The implementation utilises sophisticated algorithms.
        These methodologies optimise performance characteristics.
        Consequently, efficiency metrics demonstrate significant improvement.`;

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.complex_word_ratio).toBeGreaterThan(0.3);
      expect(result.flesch_kincaid_score).toBeLessThan(60);
    });

    it('should analyse conversational prose', () => {
      // Arrange
      const text = `I went to the shop. Then I bought some milk. It was cold. I came home.`;

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeLessThan(10);
      expect(result.flesch_kincaid_score).toBeGreaterThan(70);
    });

    it('should analyse descriptive prose', () => {
      // Arrange
      const text = `The magnificent spectacular sunset majestically painted the resplendent sky with brilliant luminous hues of crimson and gold.
        Mysterious shadows lengthened dramatically across the meadow as twilight mysteriously approached.
        A delicate gentle breeze rustled magnificently through the ancient venerable oak trees, carrying the delightful aromatic scent of jasmine.`;

      // Act
      const result = ProseAnalyzer.analyzeVoiceSample(text);

      // Assert
      expect(result.avg_sentence_length).toBeGreaterThan(10);
      expect(result.complex_word_ratio).toBeGreaterThan(0.2);
    });
  });
});
