const { expect } = require('chai');
const { OpenAI } = require('openai');
const { Claude } = require('@anthropic-ai/sdk');
const { testPromptArrangement } = require('../../src/utils/testUtils');

describe('Prompt Arrangement Experiments', () => {
  const sampleLongFormData = `
    The quick brown fox jumps over the lazy dog. This is a sample text that contains
    multiple paragraphs of information that would typically be included in a prompt.
    
    In this second paragraph, we continue with more context and details that would
    need to be processed by the language model. This helps simulate real-world
    scenarios where we're working with substantial amounts of text.
    
    Finally, this third paragraph completes our sample long-form content that
    would be used in testing different prompt arrangements.
  `;

  const sampleInstruction = 'Summarize the key points from the provided text in three bullet points.';

  describe('Long-form Data Placement Tests', () => {
    it('should test traditional arrangement (instruction first)', async () => {
      const traditionalPrompt = `${sampleInstruction}\n\n${sampleLongFormData}`;
      const result = await testPromptArrangement(traditionalPrompt);
      expect(result).to.be.an('object');
      expect(result.response).to.be.a('string');
      expect(result.metrics).to.include.keys(['responseTime', 'tokenCount']);
    });

    it('should test recommended arrangement (data first)', async () => {
      const recommendedPrompt = `${sampleLongFormData}\n\n${sampleInstruction}`;
      const result = await testPromptArrangement(recommendedPrompt);
      expect(result).to.be.an('object');
      expect(result.response).to.be.a('string');
      expect(result.metrics).to.include.keys(['responseTime', 'tokenCount']);
    });

    it('should compare performance metrics between arrangements', async () => {
      const traditionalPrompt = `${sampleInstruction}\n\n${sampleLongFormData}`;
      const recommendedPrompt = `${sampleLongFormData}\n\n${sampleInstruction}`;
      
      const traditionalResult = await testPromptArrangement(traditionalPrompt);
      const recommendedResult = await testPromptArrangement(recommendedPrompt);
      
      expect(traditionalResult.metrics).to.include.keys(['responseTime', 'tokenCount']);
      expect(recommendedResult.metrics).to.include.keys(['responseTime', 'tokenCount']);
      
      // Store metrics for comparison
      console.log('Traditional Arrangement Metrics:', traditionalResult.metrics);
      console.log('Recommended Arrangement Metrics:', recommendedResult.metrics);
    });
  });

  describe('Cross-Model Performance Tests', () => {
    const models = ['gpt-4', 'claude-2', 'gpt-3.5-turbo'];
    
    models.forEach(model => {
      it(`should test prompt arrangements with ${model}`, async () => {
        const traditionalPrompt = `${sampleInstruction}\n\n${sampleLongFormData}`;
        const recommendedPrompt = `${sampleLongFormData}\n\n${sampleInstruction}`;
        
        const results = await Promise.all([
          testPromptArrangement(traditionalPrompt, model),
          testPromptArrangement(recommendedPrompt, model)
        ]);
        
        results.forEach(result => {
          expect(result).to.be.an('object');
          expect(result.response).to.be.a('string');
          expect(result.metrics).to.include.keys(['responseTime', 'tokenCount']);
        });
        
        console.log(`${model} Comparison:`, {
          traditional: results[0].metrics,
          recommended: results[1].metrics
        });
      });
    });
  });
});