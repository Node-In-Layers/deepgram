import {
  FeaturesContext,
  annotatedFunction,
  createErrorObject,
} from '@node-in-layers/core'
import { create as createInternalFeatures } from '../internal/features.js'
import {
  browserSpeechToTextSchema,
  BrowserFeatures,
} from '../internal/types.js'
import {
  DeepgramConfig,
  DeepgramNamespace,
  SpeechToTextMode,
} from '../types.js'

const create = (context: FeaturesContext<DeepgramConfig>): BrowserFeatures => {
  const internalFeatures = createInternalFeatures({
    configuration: context.config[DeepgramNamespace.browser],
  })

  const speechToText = annotatedFunction(
    {
      ...browserSpeechToTextSchema,
      domain: DeepgramNamespace.browser,
    },
    (props, crossLayerProps) =>
      Promise.resolve()
        .then(async () => {
          const merged = internalFeatures.mergeSpeechToTextOptions({
            configuration: context.config[DeepgramNamespace.browser],
            props,
          })
          const audioData = internalFeatures.decodeBase64Audio({
            audioDataBase64: props.audioDataBase64,
          })

          if (merged.mode === SpeechToTextMode.prerecorded) {
            return internalFeatures.transcribePrerecorded({
              media: new Blob([audioData.buffer as any], {
                type: props.mimeType || 'application/octet-stream',
              }),
              options: merged.options,
              authentication: props.authentication,
              crossLayerProps,
            })
          }

          const chunks = internalFeatures.splitAudioIntoChunks({
            audioData,
          })
          return internalFeatures.transcribeRealtime({
            chunks,
            options: merged.options,
            authentication: props.authentication,
            crossLayerProps,
          })
        })
        .catch(error =>
          createErrorObject(
            'DEEPGRAM_BROWSER_SPEECH_TO_TEXT_FAILED',
            'Failed to transcribe audio with the browser Deepgram domain',
            error
          )
        )
  ) as any as BrowserFeatures['speechToText']

  return {
    speechToText,
  }
}

export { create }
