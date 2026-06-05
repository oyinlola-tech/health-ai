# Empty States Report

MedExplain AI now includes a dedicated empty-state registry rendered through the shared frontend shell. Empty states use the same navigation, footer, button styles, icon language, responsive layout, typography, and warm healthcare visual system as the rest of the product.

## Implemented Routes

| Route | Empty State | Primary Actions |
| --- | --- | --- |
| `/empty/no-reports` | No reports yet | Upload Report, Learn More |
| `/empty/no-appointments` | No appointments scheduled | Find Doctors, Return Dashboard |
| `/empty/no-notifications` | No notifications | Return Dashboard, Settings |
| `/empty/no-doctors` | No doctors found | Adjust Search, Doctor Careers |
| `/empty/no-search-results` | No search results | Clear Search, Help |
| `/empty/no-chat-history` | No chat history | Start Chat, View Reports |
| `/empty/no-health-history` | No health history | Open Profile, Help |
| `/empty/no-payments` | No payments | View Plans, Billing History |
| `/empty/no-subscriptions` | No subscription found | View Plans, Return Dashboard |
| `/empty/no-ai-analyses` | No AI analyses | Analyze Report, AI Chat |

## Design Notes

- Each empty state includes an illustration area, title, helpful description, primary action, and secondary action.
- Copy avoids pretending sample data exists; each page describes where real backend-driven records will appear.
- Legacy empty-state HTML paths are routed into the new SPA states for continuity.
- Layout is responsive across desktop, tablet, and mobile using the existing breakpoint system.
