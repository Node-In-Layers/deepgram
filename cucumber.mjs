export default {
  default: {
    paths: ['features/**/*.feature'],
    import: ['features/steps/steps.mjs'],
    publishQuiet: true,
    format: ['progress'],
    tags: 'not @integration',
  },
  integration: {
    paths: ['features/**/*.feature'],
    import: ['features/steps/steps.mjs'],
    publishQuiet: true,
    format: ['progress'],
    tags: '@integration',
  },
}
