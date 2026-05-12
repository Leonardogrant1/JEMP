import { PlanSimulator } from '../_components/PlanSimulator'
import { getSimulatorRefData } from './actions'

export default async function PlanSimulatorPage() {
  const refData = await getSimulatorRefData()
  return <PlanSimulator refData={refData} />
}
