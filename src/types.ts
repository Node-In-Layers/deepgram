import { Config, jsonObjSchema } from '@node-in-layers/core'
import { z } from 'zod'
import type {
  ListenV1Response,
  ListenV1AcceptedResponse,
  ListenV1ResponseMetadata,
  listen,
} from '@deepgram/sdk'

export enum DeepgramNamespace {
  browser = '@node-in-layers/deepgram/browser',
  node = '@node-in-layers/deepgram/node',
}

export enum DeepgramAuthenticationType {
  apiKey = 'apiKey',
  accessToken = 'accessToken',
}

export enum SpeechToTextMode {
  realtime = 'realtime',
  prerecorded = 'prerecorded',
}

export const deepgramAuthenticationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(DeepgramAuthenticationType.apiKey),
    apiKey: z.string().min(1),
  }),
  z.object({
    type: z.literal(DeepgramAuthenticationType.accessToken),
    accessToken: z.string().min(1),
  }),
])

export type DeepgramAuthentication = z.infer<
  typeof deepgramAuthenticationSchema
>

export type DeepgramDomainConfig = Readonly<{
  authentication?: DeepgramAuthentication
  baseUrl?: string
  defaultSpeechToTextMode?: SpeechToTextMode
  defaultSpeechToTextOptions?: Record<string, unknown>
}>

export type DeepgramConfig = Config &
  Readonly<{
    [DeepgramNamespace.browser]?: DeepgramDomainConfig
    [DeepgramNamespace.node]?: DeepgramDomainConfig
  }>

export const speechToTextBaseSchema = z.object({
  mode: z.enum(SpeechToTextMode).optional(),
  options: jsonObjSchema.optional(),
  authentication: deepgramAuthenticationSchema.optional(),
})

export type SharedSpeechToTextProps = z.infer<typeof speechToTextBaseSchema>

export const nodeSpeechToTextArgsSchema = speechToTextBaseSchema.extend({
  filePath: z.string().min(1),
})

export type NodeSpeechToTextProps = z.infer<typeof nodeSpeechToTextArgsSchema>

export const browserSpeechToTextArgsSchema = speechToTextBaseSchema.extend({
  audioDataBase64: z.string().min(1),
  mimeType: z.string().optional(),
})

export type BrowserSpeechToTextProps = z.infer<
  typeof browserSpeechToTextArgsSchema
>

export type PrerecordedSpeechToTextResponse = Readonly<{
  transcript: string
  mode: SpeechToTextMode.prerecorded
  rawResponse: any & (ListenV1Response | ListenV1AcceptedResponse)
  metadata?: any & ListenV1ResponseMetadata
}>

export type RealtimeSpeechToTextResponse = Readonly<{
  transcript: string
  mode: SpeechToTextMode.realtime
  rawResponse: any &
    Readonly<{
      messages: ReadonlyArray<
        | listen.ListenV1Results
        | listen.ListenV1Metadata
        | listen.ListenV1UtteranceEnd
        | listen.ListenV1SpeechStarted
      >
    }>
  metadata?: never
}>

export type SpeechToTextResponse =
  PrerecordedSpeechToTextResponse | RealtimeSpeechToTextResponse

export const speechToTextResponseSchema = z.discriminatedUnion('mode', [
  z.object({
    transcript: z.string(),
    mode: z.literal(SpeechToTextMode.prerecorded),
    rawResponse: jsonObjSchema,
    metadata: jsonObjSchema.optional(),
  }),
  z.object({
    transcript: z.string(),
    mode: z.literal(SpeechToTextMode.realtime),
    rawResponse: jsonObjSchema,
  }),
])
