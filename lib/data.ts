import raw from '@/data/dealership_data.json'

export type Status = 'new' | 'contacted' | 'test_drive' | 'negotiation' | 'order_placed' | 'delivered' | 'lost'
export type StatusEvent = { status: Status; timestamp: string; note?: string }
export type Branch = { id: string; name: string; city: string }
export type Rep = { id: string; name: string; branch_id: string; role: string; joined: string }
export type Lead = { id: string; customer_name: string; phone?: string; source: string; model_interested: string; status: Status; assigned_to: string; branch_id: string; created_at: string; last_activity_at: string; expected_close_date: string; deal_value: number; lost_reason: string | null; status_history: StatusEvent[] }
export type Target = { month: string; branch_id: string; target_units: number; target_revenue: number }
export type Delivery = { lead_id: string; order_date: string; delivery_date: string; days_to_deliver: number; delay_reason: string | null }
export type Dataset = { metadata: { generated_at: string; description: string; date_range: string; notes: string }; branches: Branch[]; sales_reps: Rep[]; leads: Lead[]; targets: Target[]; deliveries: Delivery[] }
export const data = raw as Dataset
export const asOfDate = new Date('2025-12-31T23:59:59Z')
export const stageOrder: Status[] = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered']
export const activeStatuses: Status[] = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed']
export const branchesById = Object.fromEntries(data.branches.map((x) => [x.id, x]))
export const repsById = Object.fromEntries(data.sales_reps.map((x) => [x.id, x]))
export const deliveriesByLead = Object.fromEntries(data.deliveries.map((x) => [x.lead_id, x]))
export const money = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: v >= 10000000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(v)
export const number = (v: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)
export const pct = (v: number) => `${Math.round(v * 100)}%`
export const statusLabel = (s: string) => s.replace('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase())
export const initials = (s: string) => s.split(' ').map((x) => x[0]).slice(0, 2).join('')
export const daysBetween = (a: string | Date, b: string | Date) => Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
export const leadAge = (lead: Lead) => daysBetween(lead.last_activity_at, asOfDate)
export const ageBucket = (d: number) => d < 2 ? '< 2 days' : d < 7 ? '2–7 days' : d < 14 ? '7–14 days' : d < 30 ? '14–30 days' : '30+ days'
export const reached = (lead: Lead, stage: Status) => lead.status_history.some((x) => x.status === stage)
export const currentLeads = (branchId = 'all') => data.leads.filter((l) => branchId === 'all' || l.branch_id === branchId)
export function targets(branchId = 'all') { return data.targets.filter((t) => branchId === 'all' || t.branch_id === branchId) }
export function summary(branchId = 'all') { const leads = currentLeads(branchId); const delivered = leads.filter((l) => l.status === 'delivered'); const active = leads.filter((l) => activeStatuses.includes(l.status)); const target = targets(branchId).reduce((s, x) => s + x.target_revenue, 0); const targetUnits = targets(branchId).reduce((s, x) => s + x.target_units, 0); return { leads, delivered, active, revenue: delivered.reduce((s, x) => s + x.deal_value, 0), pipeline: active.reduce((s, x) => s + x.deal_value, 0), target, targetUnits, conversion: leads.length ? delivered.length / leads.length : 0 } }
export function monthly(branchId = 'all') { const grouped = targets(branchId).reduce<Record<string, { month: string; actualUnits: number; targetUnits: number; actualRevenue: number; targetRevenue: number }>>((acc, t) => { acc[t.month] ??= { month: t.month, actualUnits: 0, targetUnits: 0, actualRevenue: 0, targetRevenue: 0 }; acc[t.month].targetUnits += t.target_units; acc[t.month].targetRevenue += t.target_revenue; return acc }, {}); data.leads.filter((l) => l.status === 'delivered' && (branchId === 'all' || l.branch_id === branchId)).forEach((l) => { const month = l.last_activity_at.slice(0, 7); if (grouped[month]) { grouped[month].actualUnits += 1; grouped[month].actualRevenue += l.deal_value } }); return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)) }
export function funnel(branchId = 'all') { const leads = currentLeads(branchId); const counts = stageOrder.map((stage) => ({ stage, count: leads.filter((l) => reached(l, stage)).length })); return { counts, lost: leads.filter((l) => l.status === 'lost').length, weakest: counts.slice(1).reduce((best, x, i) => { const prev = counts[i].count; const rate = prev ? x.count / prev : 0; return rate < best.rate ? { from: counts[i].stage, to: x.stage, rate } : best }, { from: counts[0].stage, to: counts[1].stage, rate: 1 }) } }
export function branchStats() { return data.branches.map((b) => { const s = summary(b.id); const f = funnel(b.id); const aging = s.active.filter((l) => leadAge(l) >= 7).length; return { ...b, ...s, units: s.delivered.length, unitAttainment: s.targetUnits ? s.delivered.length / s.targetUnits : 0, revenueAttainment: s.target ? s.revenue / s.target : 0, aging, bottleneck: `${statusLabel(f.weakest.from)} → ${statusLabel(f.weakest.to)}` } }).sort((a, b) => b.revenueAttainment - a.revenueAttainment) }
export function repStats() { return data.sales_reps.map((r) => { const leads = data.leads.filter((l) => l.assigned_to === r.id); const delivered = leads.filter((l) => l.status === 'delivered'); const pipeline = leads.filter((l) => activeStatuses.includes(l.status)); return { ...r, branch: branchesById[r.branch_id], leads: leads.length, units: delivered.length, revenue: delivered.reduce((s, l) => s + l.deal_value, 0), pipeline: pipeline.reduce((s, l) => s + l.deal_value, 0), conversion: leads.length ? delivered.length / leads.length : 0, aging: pipeline.filter((l) => leadAge(l) >= 7).length } }).sort((a, b) => b.conversion - a.conversion) }
export function priorityLeads(branchId = 'all') { return currentLeads(branchId).filter((l) => activeStatuses.includes(l.status)).map((l) => ({ lead: l, age: leadAge(l), reasons: [leadAge(l) >= 7 ? `${leadAge(l)} days without activity` : '', l.deal_value >= 3000000 ? money(l.deal_value) + ' opportunity' : '', ['negotiation', 'order_placed'].includes(l.status) ? statusLabel(l.status) + ' stage' : ''].filter(Boolean), score: (leadAge(l) >= 7 ? 3 : 0) + (l.deal_value >= 3000000 ? 2 : 0) + (l.status === 'order_placed' ? 3 : l.status === 'negotiation' ? 2 : 0) })).sort((a, b) => b.score - a.score) }
export function deliveryStats() { const ds = data.deliveries; const days = ds.map((d) => d.days_to_deliver).sort((a, b) => a - b); return { total: ds.length, average: ds.reduce((s, d) => s + d.days_to_deliver, 0) / (ds.length || 1), median: days[Math.floor(days.length / 2)] || 0, delayed: ds.filter((d) => d.delay_reason || d.days_to_deliver > 14).length } }
export const activeLeads = priorityLeads().map((x) => x.lead)
export default data
