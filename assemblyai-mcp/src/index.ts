#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
    // Potentially add other schemas like ReadResourceRequestSchema if needed later
} from '@modelcontextprotocol/sdk/types.js';
import { AssemblyAI } from 'assemblyai'; // Import AssemblyAI SDK
import dotenv from 'dotenv';

// Load environment variables from .env file if present
// Load environment variables from .env file in the current working directory
dotenv.config();

// --- AssemblyAI Client Setup ---
const API_KEY = process.env.ASSEMBLYAI_API_KEY;
if (!API_KEY) {
    // Log error to stderr for MCP host to potentially capture
    console.error('[MCP Error] ASSEMBLYAI_API_KEY environment variable is required');
    // Exit gracefully so the MCP host knows the server failed to start
    process.exit(1);
}

const assemblyaiClient = new AssemblyAI({
    apiKey: API_KEY,
});

// --- Tool Definitions ---
const tools = [
    {
        name: 'transcribe_audio',
        description: 'Submits an audio file (via URL) for transcription and optional analysis.',
        inputSchema: {
            type: 'object',
            properties: {
                audio_url: { type: 'string', description: 'URL of the audio file to transcribe.' },
                speaker_labels: { type: 'boolean', description: 'Enable speaker diarization.', default: false },
                language_code: { type: 'string', description: 'Language code of the audio (e.g., "en_us", "es"). See AssemblyAI docs for supported codes.', optional: true },
                enable_audio_intelligence: { type: 'boolean', description: 'Enable Audio Intelligence features.', default: false },
                intelligence_features: {
                    type: 'array',
                    items: { type: 'string', enum: ["summarization", "sentiment_analysis", "topic_detection", "auto_highlights", "entity_detection", "pii_redaction"] },
                    description: 'Specific intelligence features to enable (if enable_audio_intelligence is true).',
                    optional: true
                }
                // Add other AssemblyAI parameters as needed (e.g., custom_vocabulary, webhook_url)
            },
            required: ['audio_url']
        }
    },
    {
        name: 'get_transcript',
        description: 'Retrieves the status and results of a transcription job.',
        inputSchema: {
            type: 'object',
            properties: {
                transcript_id: { type: 'string', description: 'The ID of the transcription job.' }
            },
            required: ['transcript_id']
        }
    },
    {
        name: 'transcribe_realtime',
        description: 'Initiates a real-time transcription session (placeholder).',
        inputSchema: {
            type: 'object',
            properties: {
                sample_rate: { type: 'number', description: 'Sample rate of the audio stream (e.g., 16000).' },
                word_boost: { type: 'array', items: { type: 'string' }, description: 'Keywords to boost recognition accuracy.', optional: true },
                encoding: { type: 'string', enum: ["pcm_s16le", "pcm_mulaw", "pcm_alaw"], description: 'Audio encoding format.', optional: true }
            },
            required: ['sample_rate']
        }
    }
];


// --- MCP Server Implementation ---
class AssemblyAiServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            {
                name: 'assemblyai-mcp-server',
                version: '0.1.0',
            },
            {
                capabilities: {
                    // Resources can be added here later if needed
                    tools: {}, // Tools are dynamically listed
                },
            }
        );

        this.setupToolHandlers();

        // Basic error logging
        this.server.onerror = (error) => console.error('[MCP Error]', error);

        // Graceful shutdown
        process.on('SIGINT', this.handleShutdown.bind(this, 'SIGINT'));
        process.on('SIGTERM', this.handleShutdown.bind(this, 'SIGTERM'));
    }

    private async handleShutdown(signal: string) {
        console.error(`Received ${signal}, shutting down AssemblyAI MCP server...`);
        try {
            await this.server.close();
            console.error('Server closed gracefully.');
        } catch (error) {
            console.error('Error during server shutdown:', error);
        } finally {
            process.exit(0);
        }
    }

    private setupToolHandlers() {
        // List Tools Handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: tools, // Return the defined tools
        }));

        // Call Tool Handler
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const toolName = request.params.name;
            const args = request.params.arguments;

            console.error(`Received call for tool: ${toolName}`); // Log received call

            try {
                switch (toolName) {
                    case 'transcribe_audio': {
                        console.error(`Args for transcribe_audio: ${JSON.stringify(args)}`);
                        if (!args || typeof args !== 'object' || typeof args.audio_url !== 'string') {
                            throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required argument: audio_url');
                        }

                        // Construct parameters for AssemblyAI SDK
                        const params: any = {
                            audio_url: args.audio_url,
                            speaker_labels: args.speaker_labels === true, // Default false if not provided or not true
                        };

                        if (typeof args.language_code === 'string' && args.language_code.length > 0) {
                            params.language_code = args.language_code;
                        }

                        // Handle Audio Intelligence features
                        if (args.enable_audio_intelligence === true && Array.isArray(args.intelligence_features)) {
                            args.intelligence_features.forEach((feature: string) => {
                                // Map MCP feature names to SDK parameter names if needed, assuming direct mapping for now
                                if (["summarization", "sentiment_analysis", "topic_detection", "auto_highlights", "entity_detection"].includes(feature)) {
                                    params[feature] = true;
                                }
                                // PII Redaction might require specific configuration object
                                if (feature === "pii_redaction") {
                                    params.redact_pii = true;
                                    // Add default policies or allow configuration via args if needed
                                    params.redact_pii_policies = ["person_name", "email_address", "phone_number"]; // Example defaults
                                    params.redact_pii_audio = true; // Redact audio by default if PII redaction is enabled
                                }
                            });
                        }

                        console.error(`Calling AssemblyAI create with params: ${JSON.stringify(params)}`);
                        const job = await assemblyaiClient.transcripts.create(params);
                        console.error(`AssemblyAI job created: ${job.id}, Status: ${job.status}`);

                        // Return the job ID and initial status
                        return { content: [{ type: 'text', text: JSON.stringify({ transcript_id: job.id, status: job.status }) }] };
                    }

                    case 'get_transcript': {
                        console.error(`Args for get_transcript: ${JSON.stringify(args)}`);
                        if (!args || typeof args !== 'object' || typeof args.transcript_id !== 'string') {
                            throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required argument: transcript_id');
                        }

                        console.error(`Calling AssemblyAI get for transcript ID: ${args.transcript_id}`);
                        const transcript = await assemblyaiClient.transcripts.get(args.transcript_id);
                        console.error(`AssemblyAI transcript status: ${transcript.status}`);

                        // Return the full transcript object
                        return { content: [{ type: 'text', text: JSON.stringify(transcript, null, 2) }] }; // Pretty print JSON
                    }

                    case 'transcribe_realtime':
                        // Placeholder: Implement AssemblyAI real-time setup
                        console.error(`Args for transcribe_realtime: ${JSON.stringify(args)}`);
                        // Example: const token = await assemblyaiClient.realtime.createTemporaryToken({ expires_in: 3600 });
                        // return { content: [{ type: 'text', text: JSON.stringify({ message: 'Real-time setup placeholder', token: token }) }] };
                        return { content: [{ type: 'text', text: JSON.stringify({ message: `Placeholder for transcribe_realtime`, args: args }) }] };

                    default:
                        console.error(`Unknown tool called: ${toolName}`);
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
                }
            } catch (error: any) {
                console.error(`Error calling tool ${toolName}:`, error);
                // Try to return a meaningful error message
                const message = error instanceof Error ? error.message : 'An unknown error occurred';
                throw new McpError(ErrorCode.InternalError, `Error executing tool ${toolName}: ${message}`);
            }
        });
    }

    async run() {
        try {
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            console.error('AssemblyAI MCP server running on stdio'); // Log to stderr
        } catch (error) {
            console.error('Failed to start AssemblyAI MCP server:', error);
            process.exit(1);
        }
    }
}

// --- Global Error Handlers ---
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    process.exit(1); // Exit process on unhandled exception
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    // Optionally exit or log more details
    // process.exit(1);
});


// --- Start the Server ---
async function main() {
    try {
        console.error('Initializing AssemblyAiServer...');
        const serverInstance = new AssemblyAiServer();
        console.error('AssemblyAiServer initialized. Starting run...');
        await serverInstance.run();
        console.error('AssemblyAiServer run completed (should not happen for stdio server unless closed).');
    } catch (error) {
        console.error('Error during server instantiation or run:', error);
        process.exit(1);
    }
}

main();