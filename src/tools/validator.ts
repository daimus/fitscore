export const isEmpty = (value) => {
    if (value === null || value === undefined) return true;

    if (typeof value === 'string' || Array.isArray(value)) {
        return value.length === 0;
    }

    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }

    if (typeof value === 'number') {
        return isNaN(value) || value === 0;
    }

    return false;
}

const formatZodResult = (result, c) => {
    return {
        meta: {
            requestId: c.get('requestId'),
            ok: false,
            message: "Bad Request",
            timestamp: Date.now(),
            path: c.req.path,
            errors: result.error.issues
        }
    }
}

export const catchZod = (result, c) => {
    if (!result.success) {
        return c.json(formatZodResult(result, c), 400)
    }
}