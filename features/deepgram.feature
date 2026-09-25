@integration
Feature: Deepgram prerecorded transcription

  Scenario: Transcribe the Spacewalk speech WAV fixture
    Given we have the Deepgram WAV fixture "spacewalk.wav"
    When we transcribe the fixture with Deepgram in prerecorded mode
    Then Deepgram should return a prerecorded response containing "spacewalk"
