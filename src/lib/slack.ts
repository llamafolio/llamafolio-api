import environment from '@environment'
import type { BalancesContext, BaseContext } from '@lib/adapter'
import { type Block, type KnownBlock, WebClient } from '@slack/web-api'

const web = new WebClient(process.env.SLACK_TOKEN, {})

type Level = 'success' | 'info' | 'error'

const colors: { [key in Level]: string } = {
  success: '#2f855a',
  info: '#f2c744',
  error: '#c53030',
}

export function sendSlackMessage(
  ctx: BaseContext | BalancesContext,
  options: {
    level: Level
    header?: { [key: string]: string }
    message: string
    /**
     * Notification title
     */
    title: string
  },
) {
  const channel = environment.SLACK_CHANNEL_ID
  if (!channel /* environment.NODE_ENV !== 'production'*/) {
    return
  }

  const isBalancesContext = 'address' in ctx

  const header: { [key: string]: string } = {
    Adapter: ctx.adapterId,
    Chain: ctx.chain,
    ...options.header,
    ...(isBalancesContext ? { Address: ctx.address } : {}),
  }

  const blocks: (Block | KnownBlock)[] = []

  if (ctx.module) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ctx.module,
      },
    })
  }

  // Header
  blocks.push({
    type: 'section',
    fields: Object.keys(header).map((key) => ({
      type: 'mrkdwn',
      text: `*${key}:* ${header[key]}`,
    })),
  })

  // Message
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${options.message}`,
    },
  })

  return web.chat.postMessage({
    attachments: [
      {
        color: colors[options.level] || colors.info,
        blocks,
      },
    ],
    channel,
    text: options.title,
  })
}
