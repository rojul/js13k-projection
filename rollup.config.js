import replace from 'rollup-plugin-replace'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'

export default {
  input: './src/index.ts',
  treeshake: false,
  plugins: [
    replace({
      'process.env.NODE_ENV': '"production"'
    }),
    typescript({ abortOnError: false }),
    terser(),
  ],
  output: {
    file: './dist/index.js',
    format: 'iife',
  },
}
