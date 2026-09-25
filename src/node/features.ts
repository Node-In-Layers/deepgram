import { createReadStream } from 'node:fs'
import {
  FeaturesContext,
  annotatedFunction,
  createErrorObject,
} from '@node-in-layers/core'
import {
  DeepgramConfig,
  DeepgramNamespace,
  SpeechToTextMode,
} from '../types.js'
import { create as createInternalFeatures } from '../internal/features.js'
import { nodeSpeechToTextSchema, NodeFeatures } from '../internal/types.js'

const streamToChunks = async (stream: AsyncIterable<unknown>) => {
  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    if (chunk instanceof Uint8Array) {
      chunks.push(chunk)
      continue
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(chunk)) {
      chunks.push(new Uint8Array(chunk as any))
    }
  }

  return chunks
}

const create = (context: FeaturesContext<DeepgramConfig>): NodeFeatures => {
  const internalFeatures = createInternalFeatures({
    configuration: context.config[DeepgramNamespace.node],
  })

  const speechToText = annotatedFunction(
    {
      ...nodeSpeechToTextSchema,
      domain: DeepgramNamespace.node,
    },
    (props, crossLayerProps) =>
      Promise.resolve()
        .then(async () => {
          const merged = internalFeatures.mergeSpeechToTextOptions({
            configuration: context.config[DeepgramNamespace.node],
            props,
          })

          if (merged.mode === SpeechToTextMode.prerecorded) {
            return internalFeatures.transcribePrerecorded({
              media: createReadStream(props.filePath),
              options: merged.options,
              authentication: props.authentication,
              crossLayerProps,
            })
          }

          const chunks = await streamToChunks(createReadStream(props.filePath))
          return internalFeatures.transcribeRealtime({
            chunks,
            options: merged.options,
            authentication: props.authentication,
            crossLayerProps,
          })
        })
        .catch(error =>
          createErrorObject(
            'DEEPGRAM_NODE_SPEECH_TO_TEXT_FAILED',
            'Failed to transcribe audio with the Node Deepgram domain',
            error
          )
        )
  ) as any as NodeFeatures['speechToText']

  return {
    speechToText,
  }
}

export { create }
