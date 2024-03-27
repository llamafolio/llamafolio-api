import { handler as getBalances } from '@handlers/getBalances'
import express from 'express'

const app = express()
const port = 3000

app.get('/balances/:address', async (req, res) => {
  const address = req.params.address
  try {
    const response = await getBalances({
      pathParameters: {
        address,
      },
    })

    if (typeof response !== 'object') {
      res.sendStatus(500)
      return
    }
    res.set(response.headers)
    res.send(response.body)
  } catch (e) {
    console.log(`Errored on balances ${address}`, e)
    res.sendStatus(500)
    return
  }
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
