/** `mammoth` ships no type declarations of its own and none exist on
 * `@types/mammoth` — this covers only the one function this codebase calls
 * (`services/admin/wordQuestionParser.ts`). */
declare module 'mammoth' {
  interface ExtractRawTextResult {
    value: string
    messages: unknown[]
  }

  export function extractRawText(input: { buffer: Buffer }): Promise<ExtractRawTextResult>
}
