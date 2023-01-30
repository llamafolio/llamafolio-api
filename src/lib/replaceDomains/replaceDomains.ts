import allTLDs from './allTLDs.json'

const allTLDsRE = new RegExp(allTLDs.join('|').replace(/\./g, '\\.'))

export const replaceDomains = (input: string) => input.replace(allTLDsRE, '')
