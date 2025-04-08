# AssemblyAI MCP Server

This MCP server provides tools to interact with the AssemblyAI API for audio transcription and analysis.

## Setup

1.  **Clone the repository:**
    If you haven't already, clone the main `mcp-servers` repository.

2.  **Install Dependencies:**
    Navigate to this directory (`mcp-servers/assemblyai-mcp`) in your terminal and run:
    ```bash
    npm install
    ```

3.  **Create Environment File:**
    Create a file named `.env` in this directory (`mcp-servers/assemblyai-mcp/.env`).

4.  **Add API Key:**
    Add your AssemblyAI API key to the `.env` file:
    ```
    ASSEMBLYAI_API_KEY=YOUR_ASSEMBLYAI_API_KEY_HERE
    ```
    Replace `YOUR_ASSEMBLYAI_API_KEY_HERE` with your actual key. You can find your key on your [AssemblyAI dashboard](https://app.assemblyai.com/).
    *(Note: The `.env` file is included in `.gitignore` and should not be committed to version control.)*

5.  **Build the Server:**
    Compile the TypeScript code:
    ```bash
    npm run build
    ```
    This creates the necessary JavaScript files in the `build/` directory.

## Running the Server

This server is designed to be run by an MCP host application (like Roo). The host application should be configured to execute the compiled `build/index.js` file using Node.js. The host will manage the server process.

Example `mcp_settings.json` configuration:

```json
{
  "mcpServers": {
    "assemblyai": {
      "command": "node",
      "args": [
        "PATH_TO_REPO/mcp-servers/assemblyai-mcp/build/index.js"
        // Ensure the path is correct for your system
      ],
      "disabled": false,
      "alwaysAllow": []
      // The server loads ASSEMBLYAI_API_KEY from the .env file in its directory
    }
    // ... other servers
  }
}
```

## Available Tools

*   **`transcribe_audio`**:
    *   Description: Submits an audio file (via URL) for transcription and optional analysis.
    *   Parameters:
        *   `audio_url` (string, required): URL of the audio file.
        *   `speaker_labels` (boolean, optional): Enable speaker diarization.
        *   `language_code` (string, optional): Language code (e.g., "en_us").
        *   `enable_audio_intelligence` (boolean, optional): Enable features like summarization, sentiment analysis, etc.
        *   `intelligence_features` (array, optional): List of specific intelligence features to enable (e.g., `["summarization", "sentiment_analysis"]`).
    *   Returns: `{ "transcript_id": "string", "status": "string" }`

*   **`get_transcript`**:
    *   Description: Retrieves the status and results of a transcription job.
    *   Parameters:
        *   `transcript_id` (string, required): The ID returned by `transcribe_audio`.
    *   Returns: The full transcript object from AssemblyAI (including text, words, status, etc.).

*   **`transcribe_realtime`**:
    *   Description: (Placeholder) Intended to initiate a real-time transcription session.
    *   Parameters: `sample_rate` (required), `word_boost` (optional), `encoding` (optional).
    *   Returns: Placeholder message. *Actual implementation pending.*