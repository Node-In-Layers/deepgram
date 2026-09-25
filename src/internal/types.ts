import { CrossLayerProps, NilAnnotatedFunction } from '@node-in-layers/core'
import {
  DeepgramAuthentication,
  DeepgramDomainConfig,
  SpeechToTextResponse,
  nodeSpeechToTextArgsSchema,
  speechToTextResponseSchema,
  browserSpeechToTextArgsSchema,
  NodeSpeechToTextProps,
  BrowserSpeechToTextProps,
  SharedSpeechToTextProps,
} from '../types.js'

export const nodeSpeechToTextSchema = {
  functionName: 'speechToText',
  description:
    'Transcribes an audio file using Deepgram from a local file path in a Node.js runtime.',
  args: nodeSpeechToTextArgsSchema,
  returns: speechToTextResponseSchema,
} as const

export const browserSpeechToTextSchema = {
  functionName: 'speechToText',
  description:
    'Transcribes base64-encoded audio using Deepgram from a browser-compatible runtime.',
  args: browserSpeechToTextArgsSchema,
  returns: speechToTextResponseSchema,
} as const

export type GetAuthenticatedClientProps = Readonly<{
  authentication?: DeepgramAuthentication
}>

export type DeepgramRealtimeProps = Readonly<{
  chunks: ReadonlyArray<Uint8Array>
  options: Record<string, unknown>
  authentication?: DeepgramAuthentication
  crossLayerProps?: CrossLayerProps
}>

export type DeepgramPrerecordedProps = Readonly<{
  media: unknown
  options: Record<string, unknown>
  authentication?: DeepgramAuthentication
  crossLayerProps?: CrossLayerProps
}>

export type InternalFeatures = Readonly<{
  decodeBase64Audio: (args: Readonly<{ audioDataBase64: string }>) => Uint8Array
  mergeSpeechToTextOptions: (
    args: Readonly<{
      configuration?: DeepgramDomainConfig
      props: SharedSpeechToTextProps
    }>
  ) => Readonly<{
    mode: any
    options: Record<string, unknown>
  }>
  splitAudioIntoChunks: (
    args: Readonly<{
      audioData: Uint8Array
      chunkSize?: number
    }>
  ) => ReadonlyArray<Uint8Array>
  transcribePrerecorded: (
    args: DeepgramPrerecordedProps
  ) => Promise<SpeechToTextResponse>
  transcribeRealtime: (
    args: DeepgramRealtimeProps
  ) => Promise<SpeechToTextResponse>
}>

export type NodeFeatures = Readonly<{
  speechToText: NilAnnotatedFunction<
    NodeSpeechToTextProps,
    SpeechToTextResponse
  >
}>

export type NodeFeaturesLayer = Readonly<{
  node: NodeFeatures
}>

export type BrowserFeatures = Readonly<{
  speechToText: NilAnnotatedFunction<
    BrowserSpeechToTextProps,
    SpeechToTextResponse
  >
}>

export type BrowserFeaturesLayer = Readonly<{
  browser: BrowserFeatures
}>
