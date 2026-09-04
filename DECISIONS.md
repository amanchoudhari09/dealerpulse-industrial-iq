# DealerPulse decisions

## Product strategy
DealerPulse is intentionally CEO-first: the overview answers performance, target trajectory, attention, concentration, and action before exposing detailed records. The visual system uses a quiet warm-gray canvas, dark navy navigation, and restrained semantic accents so the dashboard reads as an operating system rather than a chart gallery.

## Metric definitions
- Revenue and units delivered are realized only when a lead has `status: delivered`.
- Active pipeline includes contacted, test drive, negotiation, and order placed leads.
- Conversion is delivered leads divided by all leads in the selected scope.
- Branch attainment is delivered units divided by the sum of branch targets.
- Lead age is measured from the most recent activity timestamp.
- Phone numbers are deliberately never surfaced in the UI.

## Tradeoffs
The source dataset is synthetic and spans June–December 2025. This first build keeps data local and calculations transparent so the take-home can be reviewed without a backend. The trajectory chart compares delivered units with branch targets; revenue is represented with a clearly labeled proportional view rather than pretending the dataset contains a separate revenue-target series.

## Next steps
A production version should connect to the CRM, add role-based access, persist saved views, and add owner-specific workflows for stale leads and delivery exceptions. Forecasting should be introduced after a longer historical series validates conversion assumptions.
