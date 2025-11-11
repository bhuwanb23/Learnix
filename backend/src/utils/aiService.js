const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.AI_SERVICE_API_KEY;
    this.endpoint = process.env.AI_SERVICE_ENDPOINT;
  }

  async generateTopicSummary(content) {
    try {
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          summary: `This is a summary of the topic content: ${content.substring(0, 100)}...`,
          keyPoints: [
            "Key point 1 from the content",
            "Key point 2 from the content",
            "Key point 3 from the content"
          ]
        };
      }

      // In a real implementation, you would call the AI service API here
      // const response = await axios.post(`${this.endpoint}/summarize`, {
      //   content: content,
      //   apiKey: this.apiKey
      // });
      
      // return response.data;
      
      // For now, return mock data
      return {
        summary: `AI-generated summary of the content: ${content.substring(0, 100)}...`,
        keyPoints: [
          "Important concept 1",
          "Important concept 2",
          "Important concept 3"
        ]
      };
    } catch (error) {
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async checkPlagiarism(text) {
    try {
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          score: Math.random() * 100,
          sources: []
        };
      }

      // In a real implementation, you would call the plagiarism detection API here
      // const response = await axios.post(`${this.endpoint}/plagiarism-check`, {
      //   text: text,
      //   apiKey: this.apiKey
      // });
      
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
      if (!this.apiKey || !this.endpoint) {
        // Return mock data if AI service is not configured
        return {
          feedback: "Good work on this assignment. Here are some suggestions for improvement...",
          suggestions: [
            "Consider adding more examples to support your arguments",
            "Check grammar and spelling in paragraph 3",
            "Add a conclusion to summarize your main points"
          ]
        };
      }

      // In a real implementation, you would call the AI feedback API here
      // const response = await axios.post(`${this.endpoint}/feedback`, {
      //   content: content,
      //   apiKey: this.apiKey
      // });
      
      // return response.data;
      
      // For now, return mock data
      return {
        feedback: "AI-generated feedback on the content...",
        suggestions: [
          "Strength: Clear structure and organization",
          "Improvement: Add more supporting evidence",
          "Tip: Consider addressing counterarguments"
        ]
      };
    } catch (error) {
      throw new Error(`Feedback generation error: ${error.message}`);
    }
  }
}

module.exports = new AIService();