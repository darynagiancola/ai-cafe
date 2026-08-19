import { AI_BARISTA_SYSTEM_PROMPT } from '../src/agent/prompts/aiBaristaPrompt.js'
import { createLangChainAiBaristaTools } from '../src/agent/langchain/createLangChainTools.js'
import { runOpenAiBaristaTurn } from '../src/agent/langchain/openAiBaristaRuntime.js'

async function main() {
  const openAiApiKey = process.env.OPENAI_API_KEY
  if (!openAiApiKey) {
    console.log(
      'SKIPPED: OPENAI_API_KEY is not set. Model invocation smoke test was not run.',
    )
    return
  }

  const result = await runOpenAiBaristaTurn({
    message: 'I only have 300 ₴. Recommend a drink and dessert.',
    conversation: [],
    sessionState: { proposedItems: [], promoCode: null },
    tools: createLangChainAiBaristaTools(),
    systemPrompt: AI_BARISTA_SYSTEM_PROMPT,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    openAiApiKey,
  })

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        messageLength: result.message.length,
        recommendationCount: result.payload?.recommendations?.length ?? 0,
        hasProposedOrder: Boolean(result.payload?.proposedOrder),
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('Server agent smoke test failed:', error)
  process.exit(1)
})
