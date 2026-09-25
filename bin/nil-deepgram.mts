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
  const subparsers = parser.add_subparsers({
    dest: 'command',
    title: 'commands',
  })
  const speechToText = subparsers.add_parser('speech-to-text', {
    help: 'Transcribe an audio file using Deepgram.',
  })
  speechToText.add_argument('filePath', {
    help: 'Path to the audio file to transcribe.',
  })
  speechToText.add_argument('-k', '--api-key', {
    help: 'Deepgram API Key. Defaults to DEEPGRAM_API_KEY environment variable.',
    dest: 'apiKey',
  })
  speechToText.add_argument('-t', '--access-token', {
    help: 'Deepgram Access Token. Defaults to DEEPGRAM_ACCESS_TOKEN environment variable.',
    dest: 'accessToken',
  })
  speechToText.add_argument('-m', '--mode', {
    choices: ['prerecorded', 'realtime'],
    default: 'prerecorded',
    help: 'Transcription mode (prerecorded or realtime). Defaults to prerecorded.',
  })
  speechToText.add_argument('-o', '--options', {
    help: 'Stringified JSON for additional Deepgram options.',
  })
  speechToText.add_argument('-j', '--json', {
    action: 'store_true',
    default: false,
    help: 'Output results as JSON so they can be piped.',
    dest: 'json',
  })
  speechToText.add_argument('-l', '--log-level', {
    choices: Object.values(LogLevelNames),
    default: LogLevelNames.silent,
    help: 'Sets the log level for Node In Layers logging. Defaults to silent.',
    dest: 'logLevel',
  })
  speechToText.add_argument('-f', '--log-format', {
    choices: Object.values(LogFormat),
    default: LogFormat.simple,
    help: 'Sets the log format for Node In Layers logging. Defaults to simple.',
    dest: 'logFormat',
  })
  const args = parser.parse_args()
  if (!args.command) {
    parser.print_help()
    return
  }
  return args
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

const _getAuthentication = (args: any) => {
  const apiKey = args.apiKey || process.env.DEEPGRAM_API_KEY
  const accessToken = args.accessToken || process.env.DEEPGRAM_ACCESS_TOKEN

  return apiKey
    ? {
        type: DeepgramAuthenticationType.apiKey,
        apiKey,
      }
    : accessToken
      ? {
          type: DeepgramAuthenticationType.accessToken,
          accessToken,
        }
      : undefined
}

const _speechToText = async (args: any) => {
  const filePath = path.resolve(args.filePath)
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`)
    process.exit(1)
  }

  const authentication = _getAuthentication(args)

  if (!authentication) {
    console.error(
      'Error: Provide --api-key, --access-token, DEEPGRAM_API_KEY, or DEEPGRAM_ACCESS_TOKEN.'
    )
    process.exit(1)
  }

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

const main = async () => {
  const args = _parseArguments()
  if (!args) {
    return
  }

  switch (args.command) {
    case 'speech-to-text':
      return _speechToText(args)
    default:
      console.error(`Unknown command: ${args.command}`)
      process.exit(1)
  }
}

if (esMain(import.meta)) {
  main()
}
