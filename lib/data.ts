import raw from '@/data/dealership_data.json'

export type Branch = { id: string; name: string; city: string }
export type Rep = { id: string; name: string; branch_id: string; role: string }
export type Lead = { id: string; customer_name: string; model_interested: string; status: string; assigned_to: string; branch_id: string; created_at: string; last_activity_at: string; expected_close_date: string; deal_value: number; lost_reason: string | null }
export type Target = { month: string; branch_id: string; target_units: number; target_revenue: number }
export type Delivery = { lead_id?: string; branch_id?: string; delivered_at?: string; units?: number; revenue?: number; [key: string]: unknown }
export type Dataset = { metadata: { date_range: string }; branches: Branch[]; sales_reps: Rep[]; leads: Lead[]; targets: Target[]; deliveries: Delivery[] }
export const data = raw as Dataset

export const money = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, notation: value >= 10000000 ? 'compact' : 'standard', compactDisplay: 'short', style: 'currency', currency: 'INR' }).format(value)
export const number = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
export const pct = (value: number) => `${Math.round(value * 100)}%`
export const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('')

export function overview(branchId = 'all') {
  const leads = branchId === 'all' ? data.leads : data.leads.filter((lead) => lead.branch_id === branchId)
  const delivered = leads.filter((lead) => lead.status === 'delivered')
  const active = leads.filter((lead) => !['delivered', 'lost'].includes(lead.status))
  const revenue = delivered.reduce((sum, lead) => sum + lead.deal_value, 0)
  const pipeline = active.reduce((sum, lead) => sum + lead.deal_value, 0)
  const target = data.targets.filter((item) => branchId === 'all' || item.branch_id === branchId).reduce((sum, item) => sum + item.target_revenue, 0)
  return { leads, delivered, active, revenue, pipeline, target, conversion: leads.length ? delivered.length / leads.length : 0 }
}

export function branchStats() {
  return data.branches.map((branch) => {
    const stats = overview(branch.id)
    const targetUnits = data.targets.filter((item) => item.branch_id === branch.id).reduce((sum, item) => sum + item.target_units, 0)
    return { ...branch, ...stats, units: stats.delivered.length, targetUnits, attainment: targetUnits ? stats.delivered.length / targetUnits : 0 }
  }).sort((a, b) => b.attainment - a.attainment)
}

export const statusLabel = (status: string) => status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
export const stageOrder = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered']
export const activeLeads = data.leads.filter((lead) => !['delivered', 'lost'].includes(lead.status)).sort((a, b) => +new Date(a.last_activity_at) - +new Date(b.last_activity_at))
export const repsById = Object.fromEntries(data.sales_reps.map((rep) => [rep.id, rep]))
export const branchesById = Object.fromEntries(data.branches.map((branch) => [branch.id, branch]))

export function monthSeries(branchId = 'all') {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((label, index) => {
    const month = String(index + 6).padStart(2, '0')
    const leads = data.leads.filter((lead) => lead.status === 'delivered' && (branchId === 'all' || lead.branch_id === branchId) && lead.last_activity_at.slice(5, 7) === month)
    const target = data.targets.filter((item) => item.month.endsWith(`-${month}`) && (branchId === 'all' || item.branch_id === branchId)).reduce((sum, item) => sum + item.target_units, 0)
    return { label, actual: leads.length, target }
  })
}

export const funnel = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered'].map((status) => ({ status, count: data.leads.filter((lead) => lead.status === status).length }))
export const insights = [
  { title: 'Protect the late-stage pipeline', body: String(data.leads.filter((lead) => lead.status === 'order_placed').length) + ' orders are placed but not delivered. Review allocation dates before the weekly operating review.', tone: 'amber' },
  { title: 'Downtown is the constraint', body: 'Downtown Toyota is the lowest-attainment branch in the current target set. Coach follow-up discipline before adding more leads.', tone: 'red' },
  { title: 'Pipeline is broad, not deep', body: String(data.leads.filter((lead) => lead.status === 'negotiation').length) + ' leads are in negotiation. Focus on next-step dates and manager-assisted closes.', tone: 'blue' },
]

export { data as dealershipData }
export default data
