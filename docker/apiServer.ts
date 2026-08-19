import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import baristaHandler from '../api/barista.js'
import paymentsHandler from '../api/payments.js'

type ServerlessRequest = {
  method?: string
  headers: IncomingHttpHeaders
  body?: unknown
  url?: string
}

type ServerlessResponse = {
  status: (statusCode: number) => ServerlessResponse
  json: (payload: unknown) => void
  send: (payload?: unknown) => void
  setHeader: (name: string, value: string) => void
}

type ServerlessHandler = (
  req: ServerlessRequest,
  res: ServerlessResponse,
) => Promise<void> | void

const routes: Record<string, ServerlessHandler> = {
  '/api/barista': baristaHandler,
  '/api/payments': paymentsHandler,
}

function getRequestPath(req: IncomingMessage): string {
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')
    return requestUrl.pathname
  } catch {
    return '/'
  }
}

function readRawBody(req: IncomingMessage): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve(undefined)
      return
    }

    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined)
        return
      }
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
  })
}

function createResponseAdapter(res: ServerResponse): ServerlessResponse {
  let statusCode = 200
  let completed = false
  const headers = new Map<string, string>()

  function writeAndEnd(payload?: string | Buffer) {
    if (completed) {
      return
    }

    completed = true
    res.writeHead(statusCode, Object.fromEntries(headers))
    if (payload === undefined) {
      res.end()
      return
    }
    res.end(payload)
  }

  const adapter: ServerlessResponse = {
    status(code: number) {
      statusCode = code
      return adapter
    },
    setHeader(name: string, value: string) {
      headers.set(name, value)
    },
    json(payload: unknown) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=utf-8')
      }
      writeAndEnd(JSON.stringify(payload))
    },
    send(payload?: unknown) {
      if (payload === undefined) {
        writeAndEnd()
        return
      }

      if (Buffer.isBuffer(payload) || typeof payload === 'string') {
        writeAndEnd(payload)
        return
      }

      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=utf-8')
      }
      writeAndEnd(JSON.stringify(payload))
    },
  }

  return adapter
}

function sendNotFound(res: ServerResponse) {
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(
    JSON.stringify({
      error: 'not_found',
      message: 'Route not found.',
    }),
  )
}

function sendInternalServerError(res: ServerResponse, error: unknown) {
  console.error('Docker API server error:', error)
  res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(
    JSON.stringify({
      error: 'internal_server_error',
      message: 'Unexpected server error.',
    }),
  )
}

const host = process.env.API_HOST ?? '0.0.0.0'
const port = Number.parseInt(process.env.API_PORT ?? '3000', 10)

createServer(async (req, res) => {
  const path = getRequestPath(req)
  const handler = routes[path]

  if (!handler) {
    sendNotFound(res)
    return
  }

  try {
    const body = await readRawBody(req)
    const adaptedRequest: ServerlessRequest = {
      method: req.method,
      headers: req.headers,
      body,
      url: req.url,
    }
    const adaptedResponse = createResponseAdapter(res)

    await handler(adaptedRequest, adaptedResponse)

    if (!res.writableEnded) {
      adaptedResponse.status(204).send()
    }
  } catch (error) {
    sendInternalServerError(res, error)
  }
}).listen(port, host, () => {
  console.log(`AURELIA API container listening on http://${host}:${port}`)
})
