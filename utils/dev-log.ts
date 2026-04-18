export function devLog(...args: unknown[]) {
    if (__DEV__) console.log(...args)
}

export function devError(...args: unknown[]) {
    if (__DEV__) console.error(...args)
}