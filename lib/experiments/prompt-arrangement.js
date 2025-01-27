/**
 * Experiment: Long-form Data at Top Prompt Arrangement
 * 
 * This module implements experiments for testing different prompt arrangements,
 * specifically focusing on placing long-form data at the beginning of prompts
 * followed by instructions - a pattern recommended by Anthropic for their Claude model.
 */

const EXPERIMENT_ID = 'prompt-arrangement';

/**
 * Creates a prompt with long-form data at the beginning followed by instructions
 * @param {string} data - The long-form data/content to be processed
 * @param {string} instructions - The instructions for processing the data
 * @returns {string} The formatted prompt
 */
function createDataFirstPrompt(data, instructions) {
    return `${data.trim()}\n\n${instructions.trim()}`;
}

/**
 * Creates a prompt with instructions first followed by data (traditional arrangement)
 * @param {string} data - The long-form data/content to be processed
 * @param {string} instructions - The instructions for processing the data
 * @returns {string} The formatted prompt
 */
function createInstructionsFirstPrompt(data, instructions) {
    return `${instructions.trim()}\n\n${data.trim()}`;
}

/**
 * Runs an A/B test comparing data-first vs instructions-first prompt arrangements
 * @param {Object} config - Configuration for the experiment
 * @param {string} config.data - The long-form data to use in the test
 * @param {string} config.instructions - The instructions to use in the test
 * @param {Function} config.evaluator - Function to evaluate the quality of responses
 * @param {Array<string>} config.models - List of models to test with
 * @returns {Promise<Object>} Results of the experiment
 */
async function runArrangementTest(config) {
    const { data, instructions, evaluator, models } = config;
    
    const results = {
        experimentId: EXPERIMENT_ID,
        timestamp: new Date().toISOString(),
        models: {},
        summary: null
    };

    for (const model of models) {
        results.models[model] = {
            dataFirst: {
                prompt: createDataFirstPrompt(data, instructions),
                // Note: Actual API calls and response handling would be implemented here
                metrics: {}
            },
            instructionsFirst: {
                prompt: createInstructionsFirstPrompt(data, instructions),
                // Note: Actual API calls and response handling would be implemented here
                metrics: {}
            }
        };
    }

    return results;
}

module.exports = {
    EXPERIMENT_ID,
    createDataFirstPrompt,
    createInstructionsFirstPrompt,
    runArrangementTest
};