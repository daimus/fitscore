import { Context } from 'hono';
export interface Variables {
    r: any,
    data: any,
    page: any,
    httpCode: number,
    message: string
}

declare module 'hono' {
    interface Context {
        r: () => Response;
    }
}