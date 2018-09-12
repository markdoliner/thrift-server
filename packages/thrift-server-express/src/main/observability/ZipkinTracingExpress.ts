import {
    defaultErrorLogger,
    getProtocol,
    getTracerForService,
    getTransport,
    hasL5DHeader,
    IZipkinPluginOptions,
    normalizeHeaders,
    readThriftMethod,
} from '@creditkarma/thrift-server-core'

import {
    Instrumentation,
    option,
    TraceId,
    Tracer,
} from 'zipkin'

import * as express from 'express'
import * as url from 'url'

function formatRequestUrl(req: express.Request): string {
    const parsed = url.parse(req.originalUrl)
    return url.format({
        protocol: req.protocol,
        host: req.get('host'),
        pathname: parsed.pathname,
        search: parsed.search,
    })
}

export function ZipkinTracingExpress({
    localServiceName,
    port = 0,
    debug = false,
    endpoint,
    sampleRate,
    httpInterval,
    httpTimeout,
    headers,
    transport = 'buffered',
    protocol = 'binary',
    logger = defaultErrorLogger,
}: IZipkinPluginOptions): express.RequestHandler {
    const tracer: Tracer = getTracerForService(localServiceName, { debug, endpoint, sampleRate, httpInterval, httpTimeout, headers, logger })
    const instrumentation = new Instrumentation.HttpServer({ tracer, port })
    return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
        tracer.scoped(() => {
            const requestMethod: string = readThriftMethod(req.body, getTransport(transport), getProtocol(protocol))
            req.headers = normalizeHeaders(req.headers)
            function readHeader(header: string): option.IOption<string | Array<string>> {
                const val = req.headers[header.toLocaleLowerCase()]
                if (val !== null && val !== undefined) {
                    return new option.Some(val)
                } else {
                    return option.None
                }
            }

            const traceId: TraceId =
                instrumentation.recordRequest(
                    (requestMethod || req.method),
                    formatRequestUrl(req),
                    (readHeader as any),
                ) as any as TraceId // Nasty but this method is incorrectly typed

            (req as any).__zipkin = {
                traceId,
                usesLinkerd: hasL5DHeader(req.headers),
                requestHeaders: req.headers,
            }

            res.on('finish', () => {
                tracer.scoped(() => {
                    instrumentation.recordResponse(
                        (traceId as any), // This method is also incorrectly typed
                        `${res.statusCode}`,
                    )
                })
            })

            next()
        })
    }
}
