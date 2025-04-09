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

This server is designed to be run by an MCP host application (like Cursor, VS Code with Cline, or Claude Desktop). The host application needs to be configured to execute the compiled `build/index.js` file using Node.js.

There are two main ways to configure the server and provide the API key:

**Method 1: Using `.env` file (Recommended for Cursor/VS Code)**

This method keeps your API key in the local `.env` file (which is ignored by Git). You need to tell the MCP host to run the server process *from* the server's directory so it can find the `.env` file.

1.  Ensure your `ASSEMBLYAI_API_KEY` is correctly set in the `.env` file (Step 4 in Setup).
2.  Configure your host application's MCP settings (e.g., `mcp_settings.json` for Cursor/Cline) by adding the `assemblyai` server entry and **crucially, setting the `cwd` (current working directory)** to the server's root folder:

    ```json
    {
      "mcpServers": {
        "assemblyai": {
          "command": "node",
          "args": [
            "PATH_TO_REPO/mcp-servers/assemblyai-mcp/build/index.js"
          ],
          "cwd": "PATH_TO_REPO/mcp-servers/assemblyai-mcp",
          "disabled": false,
          "alwaysAllow": []
        }
      }
    }
    ```
    Replace `PATH_TO_REPO` with the absolute path to where you cloned the `mcp-servers` repository (e.g., `d:\\Cascade Projects\\Assignment` on Windows).

**Method 2: Using Host Configuration `env` (Recommended for Claude Desktop)**

Some hosts, like the Claude Desktop app, might not reliably respect the `cwd` setting for loading `.env` files. In this case, it's more robust to provide the API key directly via the host's configuration.

1.  Configure your host application's MCP settings (e.g., `claude_desktop_config.json`) by adding the `assemblyai` server entry, including the `env` block:

    ```json
    {
      "mcpServers": {
        "assemblyai": {
          "command": "node",
          "args": [
            "PATH_TO_REPO/mcp-servers/assemblyai-mcp/build/index.js"
          ],
          "cwd": "PATH_TO_REPO/mcp-servers/assemblyai-mcp",
          "env": {
            "ASSEMBLYAI_API_KEY": "<YOUR_ASSEMBLYAI_API_KEY_HERE>"
          },
          "disabled": false,
          "alwaysAllow": []
        }
      }
    }
    ```
    Replace `PATH_TO_REPO` and `<YOUR_ASSEMBLYAI_API_KEY_HERE>`.
2.  See the `claude_config_example.json` file in this directory for a template.

**Important:** After modifying the host application's configuration file, you usually need to **restart the host application** (e.g., close and reopen Cursor or Claude Desktop) for the changes to take effect.

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