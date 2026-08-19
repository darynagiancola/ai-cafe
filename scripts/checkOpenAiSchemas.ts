import { z } from 'zod'
import { OPENAI_TOOL_SCHEMAS } from '../src/agent/langchain/createLangChainTools.js'
import { llmOutputSchema } from '../src/agent/langchain/openAiBaristaRuntime.js'

type JsonValue = unknown
type JsonObject = Record<string, JsonValue>

const DISALLOWED_SCHEMA_KEYS = new Set([
  'anyOf',
  'oneOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'default',
])

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function walkSchema(node: JsonValue, path: string, issues: string[]) {
  if (!isObject(node)) {
    return
  }

  for (const key of Object.keys(node)) {
    if (DISALLOWED_SCHEMA_KEYS.has(key)) {
      issues.push(`${path}: disallowed JSON Schema keyword "${key}"`)
    }
  }

  if (node.type === 'object') {
    if (!isObject(node.properties)) {
      issues.push(`${path}: object schema must include explicit "properties" object`)
    } else {
      const propertyNames = Object.keys(node.properties)
      if (propertyNames.length === 0) {
        issues.push(`${path}: object schema must define at least one property`)
      }

      const required = Array.isArray(node.required) ? node.required : null
      if (!required) {
        issues.push(`${path}: object schema must include "required" array`)
      } else {
        for (const propertyName of propertyNames) {
          if (!required.includes(propertyName)) {
            issues.push(
              `${path}: required array must include property "${propertyName}"`,
            )
          }
        }
      }
    }

    if (node.additionalProperties !== false) {
      issues.push(`${path}: additionalProperties must be false`)
    }
  }

  for (const [key, value] of Object.entries(node)) {
    const nextPath = `${path}.${key}`
    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        walkSchema(entry, `${nextPath}[${index}]`, issues),
      )
      continue
    }

    walkSchema(value, nextPath, issues)
  }
}

function validateSchema(name: string, schema: z.ZodTypeAny, issues: string[]) {
  const jsonSchema = z.toJSONSchema(schema)
  if (!isObject(jsonSchema)) {
    issues.push(`${name}: JSON Schema conversion did not return an object`)
    return
  }

  if (jsonSchema.type !== 'object') {
    issues.push(`${name}: top-level schema type must be "object"`)
  }

  walkSchema(jsonSchema, name, issues)
}

const issues: string[] = []

validateSchema('responseFormat', llmOutputSchema, issues)
for (const [name, schema] of Object.entries(OPENAI_TOOL_SCHEMAS)) {
  validateSchema(`tool:${name}`, schema, issues)
}

if (issues.length > 0) {
  console.error('OpenAI schema compatibility check failed:')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log(
  `OpenAI schema compatibility check passed for ${
    Object.keys(OPENAI_TOOL_SCHEMAS).length + 1
  } schemas.`,
)
