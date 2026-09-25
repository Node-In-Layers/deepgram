import { Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  CoreNamespace,
  LogFormat,
  LogLevelNames,
  loadSystem,
} from '@node-in-layers/core'
import * as nodeDomain from '../../src/node/index.js'
import {
  DeepgramNamespace,
  DeepgramAuthenticationType,
  SpeechToTextMode,
  SpeechToTextResponse,
} from '../../src/types.js'

setDefaultTimeout(60_000)

type World = {
  filePath?: string
  result?: SpeechToTextResponse
}

Given(
  'we have the Deepgram WAV fixture {string}',
  function (this: World, fileName: string) {
    if (!process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_ACCESS_TOKEN) {
      throw new Error(
        'DEEPGRAM_API_KEY or DEEPGRAM_ACCESS_TOKEN is required for integration tests'
      )
    }

    const filePath = join(process.cwd(), 'features', 'fixtures', fileName)
    if (!existsSync(filePath)) {
      throw new Error(`Deepgram fixture does not exist: ${filePath}`)
    }

    this.filePath = filePath
  }
)

When(
  'we transcribe the fixture with Deepgram in prerecorded mode',
  async function (this: World) {
    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY is required for integration tests')
    }

    const system = await loadSystem({
      environment: 'test',
      config: {
        environment: 'test',
        systemName: 'deepgram-feature-test',
        [CoreNamespace.root]: {
          domains: [nodeDomain],
          layerOrder: ['services', 'features'],
          logging: {
            logFormat: LogFormat.simple,
            logLevel: LogLevelNames.silent,
          },
        },
        [DeepgramNamespace.node]: {
          authentication: {
            type: DeepgramAuthenticationType.apiKey,
            apiKey: process.env.DEEPGRAM_API_KEY!,
          },
        },
      },
    })

    const result = await system.features[DeepgramNamespace.node].speechToText({
      filePath: this.filePath!,
      mode: SpeechToTextMode.prerecorded,
    })

    if ('error' in result) {
      throw new Error(JSON.stringify(result.error))
    }

    this.result = result
  }
)

Then(
  'Deepgram should return a prerecorded response containing {string}',
  function (this: World, expectedTranscriptFragment: string) {
    if (!this.result) {
      throw new Error('Expected a Deepgram response')
    }

    if (this.result.mode !== SpeechToTextMode.prerecorded) {
      throw new Error(`Expected prerecorded mode, got ${this.result.mode}`)
    }

    if (typeof this.result.transcript !== 'string') {
      throw new Error('Expected Deepgram response to contain a transcript')
    }

    if (
      this.result.transcript
        .toLocaleLowerCase()
        .includes(expectedTranscriptFragment.toLocaleLowerCase()) === false
    ) {
      throw new Error(
        `Expected transcript to contain "${expectedTranscriptFragment}", got "${this.result.transcript}"`
      )
    }
  }
)
