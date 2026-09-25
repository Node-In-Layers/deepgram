import { DeepgramClient } from '@deepgram/sdk'
import {
  DeepgramAuthenticationType,
  DeepgramDomainConfig,
  SpeechToTextMode,
  SpeechToTextResponse,
  SharedSpeechToTextProps,
  DeepgramApiKeyAuthentication,
  DeepgramAuthentication,
  DeepgramAccessTokenAuthentication,
} from '../types.js'
import {
  DeepgramPrerecordedProps,
  DeepgramRealtimeProps,
  InternalFeatures,
  GetAuthenticatedClientProps,
} from './types.js'

const defaultRealtimeChunkSize = 64 * 1024
const defaultPrerecordedOptions: Record<string, unknown> = {
  model: 'nova-3',
  smart_format: true,
  punctuate: true,
  paragraphs: true,
}

const defaultRealtimeOptions: Record<string, unknown> = {
  model: 'nova-3',
  smart_format: true,
  punctuate: true,
}

const chunkTextIntoParagraphs = (rawText: string): readonly string[] => {
  const normalized = rawText.trim()
  if (!normalized) {
    return []
  }

  if (normalized.includes('\n\n')) {
    return normalized
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)
  }

  const sentences = normalized.match(/[^.!?]+(?:[.!?]+|$)/g)
  if (!sentences || sentences.length <= 4) {
    return [normalized]
  }

  const sentencesPerParagraph = 4
  const count = Math.ceil(sentences.length / sentencesPerParagraph)
  return Array.from({ length: count }).map((_, index) => {
    const start = index * sentencesPerParagraph
    const end = start + sentencesPerParagraph
    return sentences
      .slice(start, end)
      .map(s => s.trim())
      .join(' ')
  })
}

const formatPrerecordedTranscript = (alternative: any): string => {
  if (!alternative) {
    return ''
  }

  const paragraphsFromTranscript = alternative?.paragraphs?.transcript?.trim()
  if (paragraphsFromTranscript) {
    return paragraphsFromTranscript
  }

  const paragraphItems = alternative?.paragraphs?.paragraphs
  if (Array.isArray(paragraphItems) && paragraphItems.length > 0) {
    const formatted = paragraphItems
      .map((p: any) => {
        const speakerPrefix =
          typeof p.speaker === 'number' ? `Speaker ${p.speaker}: ` : ''
        const text =
          p.sentences
            ?.map((s: any) => s.text?.trim())
            .filter(Boolean)
            .join(' ') || ''
        return `${speakerPrefix}${text}`.trim()
      })
      .filter(Boolean)
      .join('\n\n')

    if (formatted) {
      return formatted
    }
  }

  const rawTranscript = alternative?.transcript?.trim() || ''
  if (!rawTranscript) {
    return ''
  }

  return chunkTextIntoParagraphs(rawTranscript).join('\n\n')
}

const _isAuthentication = (
  authentication?: DeepgramAuthentication
): authentication is
  DeepgramApiKeyAuthentication | DeepgramAccessTokenAuthentication => {
  if (!authentication) {
    return false
  }
  return (
    authentication.type === DeepgramAuthenticationType.apiKey ||
    authentication.type === DeepgramAuthenticationType.accessToken
  )
}

const create = (
  props?: Readonly<{ configuration?: DeepgramDomainConfig }>
): InternalFeatures => {
  const getAuthenticatedClient = async (
    _args?: GetAuthenticatedClientProps
  ): Promise<DeepgramClient> => {
    const authentication =
      _args?.authentication ?? props?.configuration?.authentication
    if (!_isAuthentication(authentication)) {
      throw new Error('Invalid Deepgram authentication configuration.')
    }

    const clientOptions =
      authentication.type === DeepgramAuthenticationType.accessToken
        ? {
            accessToken: authentication.accessToken,
          }
        : {
            apiKey: authentication.apiKey,
          }

    return new DeepgramClient({
      ...clientOptions,
      ...(props?.configuration?.baseUrl
        ? {
            baseUrl: props.configuration.baseUrl,
          }
        : {}),
    })
  }

  const decodeBase64Audio = (args: Readonly<{ audioDataBase64: string }>) => {
    const binaryText = atob(args.audioDataBase64)
    return Uint8Array.from(binaryText, character => character.charCodeAt(0))
  }

  const mergeSpeechToTextOptions = (
    args: Readonly<{
      configuration?: DeepgramDomainConfig
      props: SharedSpeechToTextProps
    }>
  ) => {
    const mode =
      args.props.mode ??
      args.configuration?.defaultSpeechToTextMode ??
      props?.configuration?.defaultSpeechToTextMode ??
      SpeechToTextMode.realtime

    const defaults =
      mode === SpeechToTextMode.prerecorded
        ? defaultPrerecordedOptions
        : defaultRealtimeOptions

    return {
      mode,
      options: {
        ...defaults,
        ...(props?.configuration?.defaultSpeechToTextOptions || {}),
        ...(args.configuration?.defaultSpeechToTextOptions || {}),
        ...(args.props.options || {}),
      },
    }
  }

  const splitAudioIntoChunks = (
    args: Readonly<{
      audioData: Uint8Array
      chunkSize?: number
    }>
  ) => {
    const chunkSize = args.chunkSize ?? defaultRealtimeChunkSize

    return Array.from({
      length: Math.ceil(args.audioData.length / chunkSize),
    }).map((_, index) => {
      const start = index * chunkSize
      const end = start + chunkSize
      return args.audioData.slice(start, end)
    })
  }

  const transcribeRealtime = async (
    args: DeepgramRealtimeProps
  ): Promise<SpeechToTextResponse> => {
    const client = await getAuthenticatedClient({
      authentication: args.authentication,
    })
    const connection = await client.listen.v1.connect(args.options as any)
    const transcripts: string[] = []
    const messages: any[] = []

    await new Promise<void>((resolve, reject) => {
      let isSettled = false

      const resolveOnce = () => {
        if (isSettled) {
          return
        }
        isSettled = true
        resolve()
      }

      const rejectOnce = (error: unknown) => {
        if (isSettled) {
          return
        }
        isSettled = true
        reject(error)
      }

      connection.on('message', (message: any) => {
        messages.push(message)
        const transcript = message?.channel?.alternatives?.[0]?.transcript
        if (
          message?.type === 'Results' &&
          message?.is_final &&
          typeof transcript === 'string' &&
          transcript.trim()
        ) {
          transcripts.push(transcript.trim())
        }
      })

      connection.on('close', () => {
        resolveOnce()
      })

      connection.on('error', (error: unknown) => {
        rejectOnce(error)
      })

      Promise.resolve()
        .then(async () => {
          connection.connect()
          await connection.waitForOpen()
          args.chunks.forEach(chunk => {
            connection.sendMedia(chunk)
          })
          connection.sendCloseStream({ type: 'CloseStream' })
        })
        .catch(rejectOnce)
    })

    return {
      transcript: transcripts.join('\n\n'),
      mode: SpeechToTextMode.realtime,
      rawResponse: {
        messages,
      },
    }
  }

  const transcribePrerecorded = async (
    args: DeepgramPrerecordedProps
  ): Promise<SpeechToTextResponse> => {
    const client = await getAuthenticatedClient({
      authentication: args.authentication,
    })
    const response = await client.listen.v1.media.transcribeFile(
      args.media as any,
      args.options as any
    )

    if (response && 'results' in response) {
      const alternative = response.results?.channels?.[0]?.alternatives?.[0]
      const transcript = formatPrerecordedTranscript(alternative)

      return {
        transcript,
        mode: SpeechToTextMode.prerecorded,
        rawResponse: response as any,
        ...(response.metadata
          ? {
              metadata: response.metadata,
            }
          : {}),
      }
    }

    return {
      transcript: '',
      mode: SpeechToTextMode.prerecorded,
      rawResponse: response as any,
    }
  }

  return {
    decodeBase64Audio,
    mergeSpeechToTextOptions,
    splitAudioIntoChunks,
    transcribePrerecorded,
    transcribeRealtime,
  }
}

export { create }
