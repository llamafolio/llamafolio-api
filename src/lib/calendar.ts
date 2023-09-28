import type { BaseFormattedBalance } from '@db/balances'
import type { GovernanceProposal } from '@lib/governance'

export type CalendarEventType = 'unlock' | 'vest' | 'governance_proposal'

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

export type CalendarEvent = CalendarUnlockEvent | CalendarVestEvent | CalendarGovernanceProposalEvent
