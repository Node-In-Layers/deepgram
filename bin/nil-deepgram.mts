#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ArgumentParser } from 'argparse'
import esMain from 'es-main'
import {
  loadSystem,
  CoreNamespace,
  LogFormat,
  LogLevelNames,
  isErrorObject,
} from '@node-in-layers/core'
import {
  DeepgramNamespace,
  SpeechToTextMode,
  DeepgramAuthenticationType,
} from '../src/types.js'
import * as nodeDomain from '../src/node/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const _getDeepgramVersion = () => {
  const packageJsonPath = path.join(__dirname, '../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  return packageJson.version
}

const _parseArguments = () => {
  const parser = new ArgumentParser({
    prog: 'nil-deepgram',
    description:
      'A CLI tool to transcribe audio files using Deepgram via Node In Layers.',
  })
  parser.add_argument('-v', '--version', {
    action: 'version',
    version: _getDeepgramVersion(),
  })
  parser.add_argument('filePath', {
    help: 'Path to the audio file to transcribe.',
  })
  parser.add_argument('-k', '--api-key', {
    help: 'Deepgram API Key. Defaults to DEEPGRAM_API_KEY environment variable.',
    dest: 'apiKey',
  })
  parser.add_argument('-t', '--access-token', {
    help: 'Deepgram Access Token. Defaults to DEEPGRAM_ACCESS_TOKEN environment variable.',
    dest: 'accessToken',
  })
  parser.add_argument('-m', '--mode', {
    choices: ['prerecorded', 'realtime'],
    default: 'prerecorded',
    help: 'Transcription mode (prerecorded or realtime). Defaults to prerecorded.',
  })
  parser.add_argument('-o', '--options', {
    help: 'Stringified JSON for additional Deepgram options.',
  })
  parser.add_argument('-j', '--json', {
    action: 'store_true',
    default: false,
    help: 'Output results as JSON so they can be piped.',
    dest: 'json',
  })
  parser.add_argument('-l', '--log-level', {
    choices: Object.values(LogLevelNames),
    default: LogLevelNames.silent,
    help: 'Sets the log level for Node In Layers logging. Defaults to silent.',
    dest: 'logLevel',
  })
  parser.add_argument('-f', '--log-format', {
    choices: Object.values(LogFormat),
    default: LogFormat.simple,
    help: 'Sets the log format for Node In Layers logging. Defaults to simple.',
    dest: 'logFormat',
  })
  return parser.parse_args()
}

const _getConfig = (args: any) => {
  return {
    environment: 'production',
    systemName: 'nil-deepgram-cli',
    [CoreNamespace.root]: {
      domains: [nodeDomain],
      layerOrder: ['services', 'features'],
      logging: {
        logLevel: args.logLevel,
        logFormat: args.logFormat,
      },
    },
  }
}

const main = async () => {
  const args = _parseArguments()
  if (!args) {
    return
  }

  const filePath = path.resolve(args.filePath)
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`)
    process.exit(1)
  }

  const authentication = args.apiKey
    ? {
        type: DeepgramAuthenticationType.apiKey,
        apiKey: args.apiKey,
      }
    : args.accessToken
      ? {
          type: DeepgramAuthenticationType.accessToken,
          accessToken: args.accessToken,
        }
      : undefined

  const extraOptions = args.options
    ? (() => {
        try {
          return JSON.parse(args.options)
        } catch (e: any) {
          console.error(`Error parsing JSON options: ${e.message}`)
          process.exit(1)
        }
      })()
    : {}

  // Load the system with our deepgram node domain
  const system = await loadSystem({
    environment: 'production',
    config: _getConfig(args),
  })

  // Invoke the speechToText feature
  // @ts-ignore
  const result = await system.features[DeepgramNamespace.node].speechToText({
    filePath,
    mode:
      args.mode === 'prerecorded'
        ? SpeechToTextMode.prerecorded
        : SpeechToTextMode.realtime,
    authentication,
    options: extraOptions,
  })

  if (isErrorObject(result)) {
    if (args.json) {
      console.error(JSON.stringify(result, null, 2))
    } else {
      console.error('Transcription failed:')
      console.error(JSON.stringify(result.error, null, 2))
    }
    process.exit(1)
  }

  if (args.json) {
    console.info(JSON.stringify(result, null, 2))
  } else if (result && 'transcript' in result) {
    console.info(result.transcript)
  } else {
    console.info(JSON.stringify(result, null, 2))
  }
}

if (esMain(import.meta)) {
  main()
}
