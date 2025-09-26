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