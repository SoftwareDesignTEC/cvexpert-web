/** Replaces named resource placeholders without interpreting markup. */
export function formatMessage(message: string, values: Record<string, string | number>): string {
    return message.replace(/\{(\w+)\}/g, (token, key: string) => Object.hasOwn(values, key) ? String(values[key]) : token);
}
