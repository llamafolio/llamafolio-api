import type { BaseFormattedBalance } from '@db/balances'
import { selectCalendarEvents } from '@db/calendar'
import { client } from '@db/clickhouse'
import { type ENSRegistration, getENSRegistrations } from '@lib/ens'
import type { GovernanceProposal } from '@lib/governance'

export type CalendarEventType = 'unlock' | 'vest' | 'governance_proposal' | 'ens_registration'

export interface CalendarBaseEvent {
  type: CalendarEventType
  startDate: number
  endDate?: number
  protocol: string
  parentProtocol: string
  chain: string
}

export interface CalendarUnlockEvent extends CalendarBaseEvent {
  type: 'unlock'
  balance: BaseFormattedBalance
}

export interface CalendarVestEvent extends CalendarBaseEvent {
  type: 'vest'
  balance: BaseFormattedBalance
}

export interface CalendarGovernanceProposalEvent extends CalendarBaseEvent {
  type: 'governance_proposal'
  governanceProposal: GovernanceProposal
}

export interface CalendarEnsRegistrationEvent extends CalendarBaseEvent {
  type: 'ens_registration'
  registration: ENSRegistration
}

export type CalendarEvent =
  | CalendarUnlockEvent
  | CalendarVestEvent
  | CalendarGovernanceProposalEvent
  | CalendarEnsRegistrationEvent

export async function getCalendarEvents(address: `0x${string}`) {
  const [dbCalendarEvents, ensRegistrations] = await Promise.all([
    selectCalendarEvents(client, address),
    getENSRegistrations(address),
  ])

  const ensRegistrationEvents: CalendarEnsRegistrationEvent[] = ensRegistrations.map((registration) => ({
    type: 'ens_registration',
    protocol: 'ens',
    parentProtocol: 'ens',
    chain: 'ethereum',
    startDate: registration.expiryDate,
    registration,
  }))

  const calendarEvents: CalendarEvent[] = [...dbCalendarEvents, ...ensRegistrationEvents]

  return calendarEvents.sort((a, b) => a.startDate - b.startDate)
}
