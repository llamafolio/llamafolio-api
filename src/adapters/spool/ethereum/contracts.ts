import { Contract } from '@lib/adapter'
import { providers } from '@lib/providers'
import { ethers } from 'ethers'

import ControllerAbi from '../abis/Controller.json'

export async function getPoolsContracts(spoolController: Contract) {
  const provider = providers['ethereum']
  const contract = new ethers.Contract(spoolController.address, ControllerAbi, provider)

  const allStrategies = await contract.getAllStrategies()
  const formattedPools = allStrategies.map((address: string) => ({
    name: 'spool',
    displayName: `Spool Pool`,
    chain: 'ethereum',
    address,
  }))

  return formattedPools
}
