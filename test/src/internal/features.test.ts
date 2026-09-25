import { strict as assert } from 'node:assert'
import { describe, it } from 'mocha'
import { create } from '../../../src/internal/features.js'
import { SpeechToTextMode } from '../../../src/types.js'

describe('/src/internal/features.ts', () => {
  describe('#mergeSpeechToTextOptions()', () => {
    it('should include prerecorded defaults', () => {
      const input = {
        props: {
          mode: SpeechToTextMode.prerecorded,
        },
      }
      const actual = create().mergeSpeechToTextOptions(input)

      assert.equal(actual.mode, SpeechToTextMode.prerecorded)
      assert.equal(actual.options.model, 'nova-3')
      assert.equal(actual.options.paragraphs, true)
    })
  })

  describe('#splitAudioIntoChunks()', () => {
    it('should split audio into the requested chunk size', () => {
      const input = {
        audioData: new Uint8Array([1, 2, 3, 4, 5]),
        chunkSize: 2,
      }
      const actual = create().splitAudioIntoChunks(input)

      assert.deepEqual(actual, [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4]),
        new Uint8Array([5]),
      ])
    })
  })
})
