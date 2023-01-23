export const isOffline = process.env.IS_OFFLINE
export const AWS_ENDPOINT = isOffline ? 'http://localhost:3002' : undefined
