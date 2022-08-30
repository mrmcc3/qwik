import type { QwikCityRequestOptions, QwikCityRequestContext } from '../request-handler/types';
import { notFoundHandler, requestHandler } from '../request-handler';
import type { Render } from '@builder.io/qwik/server';

// @builder.io/qwik-city/middleware/vercel-edge

/**
 * @alpha
 */
export function qwikCity(render: Render, opts?: QwikCityVercelOptions) {
  async function onRequest(request: Request) {
    try {
      const url = new URL(request.url);

      const requestCtx: QwikCityRequestContext<Response> = {
        url,
        request,
        response: (status, headers, body) => {
          return new Promise<Response>((resolve) => {
            let flushedHeaders = false;
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const response = new Response(readable, { status, headers });

            body({
              write: (chunk) => {
                if (!flushedHeaders) {
                  flushedHeaders = true;
                  resolve(response);
                }
                if (typeof chunk === 'string') {
                  const encoder = new TextEncoder();
                  writer.write(encoder.encode(chunk));
                } else {
                  writer.write(chunk);
                }
              },
            }).finally(() => {
              if (!flushedHeaders) {
                flushedHeaders = true;
                resolve(response);
              }
              writer.close();
            });
          });
        },
      };

      const handledResponse = await requestHandler<Response>(requestCtx, render, {}, opts);
      if (handledResponse) {
        return handledResponse;
      }

      return await notFoundHandler<Response>(requestCtx);
    } catch (e: any) {
      return new Response(String(e || 'Error'), {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  return onRequest;
}

/**
 * @alpha
 */
export interface QwikCityVercelOptions extends QwikCityRequestOptions {}
