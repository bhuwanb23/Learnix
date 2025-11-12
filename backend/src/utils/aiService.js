const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.AI_SERVICE_API_KEY;
    this.endpoint = process.env.AI_SERVICE_ENDPOINT;
  }

  // Enhanced text preprocessing
  preprocessText(text) {
    // Remove extra whitespace and normalize
    return text.trim().replace(/\s+/g, ' ');
  }

  // Extract keywords from text
  extractKeywords(text, count = 5) {
    // Simple keyword extraction (in a real implementation, this would use NLP libraries)
    const words = this.preprocessText(text.toLowerCase())
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    // Count word frequencies
    const wordFreq = {};
    words.forEach(word => {
      if (word.length > 3) { // Only consider words longer than 3 characters
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    // Sort by frequency and return top keywords
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }

  // Calculate text statistics
  getTextStatistics(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\n/).filter(paragraph => paragraph.trim().length > 0);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
      readingTime: Math.ceil(words.length / 200) // avg 200 words per minute
    };
  }

  async generateTopicSummary(content, options = {}) {
    try {
      // Preprocess content
      const processedContent = this.preprocessText(content);
      const keywords = this.extractKeywords(processedContent);
      const stats = this.getTextStatistics(processedContent);
      
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          summary: `This is a summary of the topic content: ${processedContent.substring(0, 100)}...`,
          keyPoints: [
            "Key point 1 from the content",
            "Key point 2 from the content",
            "Key point 3 from the content"
          ],
          keywords: keywords,
          wordCount: stats.wordCount,
          readingTime: stats.readingTime
        };
      }

      // In a real implementation, you would call the AI service API here
      // const response = await axios.post(`${this.endpoint}/summarize`, {
      //   content: processedContent,
      //   apiKey: this.apiKey,
      //   options: options
      // });
      // 
      // return response.data;
      
      // For now, return mock data with enhanced processing
      return {
        summary: `AI-generated summary of the content: ${processedContent.substring(0, 100)}...`,
        keyPoints: [
          "Important concept 1",
          "Important concept 2",
          "Important concept 3"
        ],
        keywords: keywords,
        wordCount: stats.wordCount,
        readingTime: stats.readingTime
      };
    } catch (error) {
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async generateTopicExplanation(topic, context, difficulty = 'intermediate') {
    try {
      const prompt = `Explain the topic "${topic}" in a ${difficulty} level. Context: ${context}`;
      
      // Preprocess inputs
      const processedTopic = this.preprocessText(topic);
      const processedContext = this.preprocessText(context);
      
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          explanation: `This is an AI-generated explanation of ${processedTopic} at ${difficulty} level.`,
          examples: [
            "Example 1 demonstrating the concept",
            "Example 2 showing practical application"
          ],
          analogies: [
            "Think of it like this...",
            "It's similar to..."
          ],
          difficulty: difficulty,
          relatedTopics: this.extractKeywords(processedTopic, 3)
        };
      }

      // In a real implementation, you would call the AI service API here
      // const response = await axios.post(`${this.endpoint}/explain`, {
      //   prompt: prompt,
      //   apiKey: this.apiKey
      // });
      // 
      // return response.data;
      
      // For now, return mock data with enhanced processing
      return {
        explanation: `AI-generated explanation of ${processedTopic} at ${difficulty} level with context: ${processedContext.substring(0, 50)}...`,
        examples: [
          "Practical example 1",
          "Practical example 2",
          "Practical example 3"
        ],
        analogies: [
          "Simple analogy to understand the concept",
          "Real-world comparison"
        ],
        difficulty: difficulty,
        relatedTopics: this.extractKeywords(processedTopic, 3)
      };
    } catch (error) {
      throw new Error(`Explanation generation error: ${error.message}`);
    }
  }

  // New method for generating examples
  async generateExamples(topic, count = 3) {
    try {
      const processedTopic = this.preprocessText(topic);
      
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        const examples = [];
        for (let i = 1; i <= count; i++) {
          examples.push(`Example ${i} for ${processedTopic}`);
        }
        return { examples };
      }

      // In a real implementation, you would call the AI service API here
      // const response = await axios.post(`${this.endpoint}/examples`, {
      //   topic: processedTopic,
      //   count: count,
      //   apiKey: this.apiKey
      // });
      // 
      // return response.data;
      
      // For now, return mock data
      const examples = [];
      for (let i = 1; i <= count; i++) {
        examples.push(`AI-generated example ${i} for ${processedTopic}`);
      }
      return { examples };
    } catch (error) {
      throw new Error(`Example generation error: ${error.message}`);
    }
  }

  // New method for generating practice questions
  async generatePracticeQuestions(topic, count = 5) {
    try {
      const processedTopic = this.preprocessText(topic);
      
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        const questions = [];
        for (let i = 1; i <= count; i++) {
          questions.push({
            id: `q${i}`,
            question: `Practice question ${i} about ${processedTopic}?`,
            type: i % 2 === 0 ? 'multiple_choice' : 'short_answer',
            difficulty: i % 3 === 0 ? 'hard' : i % 3 === 1 ? 'medium' : 'easy'
          });
        }
        return { questions };
      }

      // In a real implementation, you would call the AI service API here
      // const response = await axios.post(`${this.endpoint}/questions`, {
      //   topic: processedTopic,
      //   count: count,
      //   apiKey: this.apiKey
      // });
      // 
      // return response.data;
      
      // For now, return mock data
      const questions = [];
      for (let i = 1; i <= count; i++) {
        questions.push({
          id: `q${i}`,
          question: `AI-generated practice question ${i} about ${processedTopic}?`,
          type: i % 2 === 0 ? 'multiple_choice' : 'short_answer',
          difficulty: i % 3 === 0 ? 'hard' : i % 3 === 1 ? 'medium' : 'easy'
        });
      }
      return { questions };
    } catch (error) {
      throw new Error(`Question generation error: ${error.message}`);
    }
  }

  async checkPlagiarism(text) {
    try {
      const processedText = this.preprocessText(text);
      
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          score: Math.random() * 100,
          sources: []
        };
      }

      // In a real implementation, you would call the plagiarism detection API here
      // const response = await axios.post(`${this.endpoint}/plagiarism-check`, {
      //   text: processedText,
      //   apiKey: this.apiKey
      // });
      // 
      // return response.data;
      
      // For now, return mock data
      return {
        score: Math.random() * 100,
        sources: [
          { url: "https://example.com/source1", similarity: 0.75 },
          { url: "https://example.com/source2", similarity: 0.42 }
        ]
      };
    } catch (error) {
      throw new Error(`Plagiarism check error: ${error.message}`);
    }
  }

  async generateFeedback(content) {
    try {
      const processedContent = this.preprocessText(content);
      const stats = this.getTextStatistics(processedContent);
      
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          feedback: "Good work on this assignment. Here are some suggestions for improvement...",
          suggestions: [
            "Consider adding more examples to support your arguments",
            "Check grammar and spelling in paragraph 3",
            "Add a conclusion to summarize your main points"
          ],
          statistics: stats
        };
      }

      // In a real implementation, you would call the AI feedback API here
      // const response = await axios.post(`${this.endpoint}/feedback`, {
      //   content: processedContent,
      //   apiKey: this.apiKey
      // });
      // 
      // return response.data;
      
      // For now, return mock data
      return {
        feedback: "AI-generated feedback on the content...",
        suggestions: [
          "Strength: Clear structure and organization",
          "Improvement: Add more supporting evidence",
          "Tip: Consider addressing counterarguments"
        ],
        statistics: stats
      };
    } catch (error) {
      throw new Error(`Feedback generation error: ${error.message}`);
    }
  }

  // New method for quality assessment of AI-generated content
  async assessQuality(content) {
    try {
      const processedContent = this.preprocessText(content);
      const stats = this.getTextStatistics(processedContent);
      const keywords = this.extractKeywords(processedContent);
      
      // Basic quality score calculation
      let qualityScore = 0;
      
      // Content length factor (optimal length between 100-500 words)
      if (stats.wordCount >= 100 && stats.wordCount <= 500) {
        qualityScore += 0.4;
      } else if (stats.wordCount > 500) {
        qualityScore += 0.3;
      } else {
        qualityScore += 0.2;
      }
      
      // Structure factor (at least 2 paragraphs for better structure)
      if (stats.paragraphCount >= 2) {
        qualityScore += 0.3;
      } else {
        qualityScore += 0.1;
      }
      
      // Sentence variety factor
      if (stats.sentenceCount >= 3) {
        qualityScore += 0.3;
      } else {
        qualityScore += 0.1;
      }
      
      return {
        qualityScore: Math.min(1.0, qualityScore),
        metrics: stats,
        keywords: keywords,
        feedback: this.getQualityFeedback(qualityScore, stats.wordCount, stats.paragraphCount)
      };
    } catch (error) {
      throw new Error(`Quality assessment error: ${error.message}`);
    }
  }
  
  getQualityFeedback(score, wordCount, paragraphCount) {
    const feedback = [];
    
    if (wordCount < 100) {
      feedback.push("Content is too brief. Consider adding more details.");
    } else if (wordCount > 500) {
      feedback.push("Content is quite long. Consider breaking it into smaller sections.");
    }
    
    if (paragraphCount < 2) {
      feedback.push("Consider using multiple paragraphs for better structure.");
    }
    
    if (score >= 0.8) {
      feedback.push("Excellent quality content!");
    } else if (score >= 0.6) {
      feedback.push("Good quality with minor improvements possible.");
    } else {
      feedback.push("Content needs improvement in structure and detail.");
    }
    
    return feedback;
  }
}

module.exports = new AIService();