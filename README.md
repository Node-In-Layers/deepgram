# Deepgram - A Node In Layers Package

Deepgram SDK support for Node In Layers systems, with a browser-compatible API and a `nil-deepgram` command-line application.

## Quick start

### As a package

```sh
npm install @node-in-layers/deepgram
```

1. Add the Deepgram domain to your system config.
2. Reference the Deepgram features using `DeepgramNamespace.node`.
3. Configure `authentication` under `DeepgramNamespace.node`.

### As a CLI application

```sh
npm install --global @node-in-layers/deepgram
export DEEPGRAM_API_KEY="your-api-key"
nil-deepgram speech-to-text ./audio.wav
```

## API reference

### As a CLI application

Install the CLI globally:

```sh
npm install --global @node-in-layers/deepgram
```

Provide a Deepgram API key through the environment:

```sh
export DEEPGRAM_API_KEY="your-api-key"
```

Transcribe an audio file:

```sh
nil-deepgram speech-to-text ./audio.wav
```

The default output is the formatted transcript. Use `--json` when piping the complete response to another command:

```sh
nil-deepgram speech-to-text ./audio.wav --json | jq '.transcript'
```

The command supports prerecorded transcription by default. Additional options include:

```sh
nil-deepgram speech-to-text ./audio.wav \
  --mode prerecorded \
  --options '{"language":"en-US","diarize":true}' \
  --json
```

Use an access token or override the API key for one invocation:

```sh
nil-deepgram speech-to-text ./audio.wav --access-token "$DEEPGRAM_ACCESS_TOKEN"
nil-deepgram speech-to-text ./audio.wav --api-key "$DEEPGRAM_API_KEY"
```

Run `nil-deepgram --help` or `nil-deepgram speech-to-text --help` for the complete command reference.

### As a Node In Layers package

Install the package:

```sh
npm install @node-in-layers/deepgram
```

Register the Node domain in the system configuration as well as configure secrets.

```ts
import {
  CoreNamespace,
  LogFormat,
  LogLevelNames,
  loadSystem,
} from '@node-in-layers/core'
import { config as secretsConfig } from '@node-in-layers/secrets'
import * as deepgram from '@node-in-layers/deepgram/node/index.js' // Import the platform specific module. node or browser
import {
  DeepgramNamespace,
  SpeechToTextMode,
  type DeepgramConfig,
} from '@node-in-layers/deepgram'

const system = await loadSystem<DeepgramConfig>({
  environment: 'production',
  config: {
    environment: 'production',
    systemName: 'my-transcription-app',
    [CoreNamespace.root]: {
      // Core defaults...
      domains: [secretsConfig, deepgram],
    },
    [DeepgramNamespace.node]: {
      authentication: {
        type: 'apiKey',
        apiKey: {
          type: 'nil-secret',
          key: 'deepgram.apiKey',
        },
      },
    },
  },
})
```

Create/append your secrets file:

```json
// secrets.local.json
{
  "deepgram": {
    "apiKey": "your-api-key"
  }
}
```

Call the feature from the loaded system:

```ts
const result = await system.features[DeepgramNamespace.node].speechToText({
  filePath: './audio.wav',
  mode: SpeechToTextMode.prerecorded,
})
```

## CLI API

The CLI uses a command structure:

```text
nil-deepgram <command> [options]
```

### `speech-to-text`

Transcribes a local audio file using the Node In Layers Deepgram domain.

```text
nil-deepgram speech-to-text <filePath>
```

Options:

- `-k, --api-key <key>` — Deepgram API key override.
- `-t, --access-token <token>` — Deepgram access token override.
- `-m, --mode <mode>` — `prerecorded` (default) or `realtime`.
- `-o, --options <json>` — Additional Deepgram options as a JSON string.
- `-j, --json` — Emit the complete response as JSON.
- `-l, --log-level <level>` — Node In Layers log level; defaults to `silent`.
- `-f, --log-format <format>` — Node In Layers log format; defaults to `simple`.

## Package API

The package exports:

- `@node-in-layers/deepgram` — shared types and namespace exports.
- `@node-in-layers/deepgram/node/index.js` — Node domain, including local-file transcription.
- `@node-in-layers/deepgram/browser/index.js` — browser domain, including base64 audio transcription.

Prerecorded transcription defaults to Deepgram's `nova-3` model with smart formatting, punctuation, and paragraph formatting enabled. Additional options can override those defaults.
