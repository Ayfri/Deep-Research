import { OPENAI_API_KEY, PERPLEXITY_API_KEY } from '$env/static/private';

type Message = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type OpenAIResponse = {
    choices: {
        message: {
            content: string;
        };
    }[];
    usage?: {
        total_tokens: number;
    };
};

type PerplexityResponse = {
    choices: {
        message: {
            content: string;
        };
    }[];
    citations?: string[];
    usage?: {
        total_tokens: number;
    };
};

/**
 * Call OpenAI API with error handling and logging
 */
export async function callOpenAI({
    model = 'gpt-4o',
    messages,
    temperature = 0.5,
    reasoningEffort
}: {
    model: string;
    messages: Message[];
    temperature?: number;
    reasoningEffort?: 'low' | 'medium' | 'high';
}): Promise<{ content: string; tokens: number }> {
    try {
        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const body: Record<string, any> = {
            model,
            messages,
            temperature
        };

        // Add reasoning_effort for o3 models if specified
        if (reasoningEffort && model.startsWith('o3')) {
            body.reasoning_effort = reasoningEffort;
        }

        console.log(`Calling OpenAI API with model: ${model}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('OpenAI API error response:', errorBody);
            try {
                const errorData = JSON.parse(errorBody);
                throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
            } catch (e) {
                throw new Error(`OpenAI API error (${response.status}): ${errorBody || 'Unknown error'}`);
            }
        }

        const data = await response.json() as OpenAIResponse;
        const content = data.choices[0].message.content;
        const tokens = data.usage?.total_tokens || Math.ceil(content.length / 4); // Estimate if not provided

        return { content, tokens };
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

/**
 * Parse JSON from a string with better error handling
 */
export function safeJsonParse<T>(jsonString: string, defaultValue?: T): T {
    try {
        // Check if the string contains markdown code blocks and extract JSON
        if (jsonString.includes('```')) {
            const match = jsonString.match(/```(?:json)?\s*([^`]+)```/s);
            if (match && match[1]) {
                jsonString = match[1].trim();
            }
        }
        
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error('JSON parse error:', error);
        console.error('Attempted to parse:', jsonString);
        
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Call Perplexity API with error handling and logging
 */
export async function callPerplexity({
    model = 'sonar-reasoning-pro',
    messages,
    temperature = 0.5
}: {
    model: string;
    messages: Message[];
    temperature?: number;
}): Promise<{ content: string; links: string[]; tokens: number }> {
    try {
        if (!PERPLEXITY_API_KEY) {
            throw new Error('Perplexity API key not configured');
        }

        console.log(`Calling Perplexity API with model: ${model}`);
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                stream: false
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Perplexity API error response:', errorBody);
            try {
                const errorData = JSON.parse(errorBody);
                throw new Error(`Perplexity API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
            } catch (e) {
                throw new Error(`Perplexity API error (${response.status}): ${errorBody || 'Unknown error'}`);
            }
        }

        const data = await response.json() as PerplexityResponse;
        const content = data.choices[0].message.content;
        const links = data.citations || [];
        const tokens = data.usage?.total_tokens || Math.ceil(content.length / 4); // Estimate if not provided

        return { content, links, tokens };
    } catch (error) {
        console.error('Error calling Perplexity API:', error);
        throw error;
    }
} 
