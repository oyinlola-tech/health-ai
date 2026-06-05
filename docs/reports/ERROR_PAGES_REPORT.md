# Error Pages Report

MedExplain AI now exposes a complete route-based recovery page system through the shared application shell. Every page uses the existing header, footer, mobile navigation, typography, spacing, button classes, and design tokens from [`DESIGN.md`](../../DESIGN.md).

## Implemented Routes

| Route | State | Primary Actions |
| --- | --- | --- |
| `/error/400` | We couldn't understand this request. | Try Again, Return Home |
| `/error/401` | You need to sign in to continue. | Login, Register |
| `/error/403` | You don't have permission to access this area. | Return Dashboard, Contact Support |
| `/error/404` | The page you're looking for does not exist. | Return Home, Search Reports |
| `/error/408` | The request took too long to complete. | Retry, Return Dashboard |
| `/error/429` | Too many requests detected. | Wait and Retry, Upgrade Plan |
| `/error/500` | Something unexpected happened on our side. | Retry, Contact Support |
| `/error/database` | We're having trouble accessing your data. | Retry Connection, Status Page |
| `/error/ai` | The AI assistant is temporarily unavailable. | Retry Analysis, View Previous Reports |
| `/error/report-processing` | We couldn't process this medical report. | Upload New Report, Learn More |
| `/error/ocr` | We couldn't read the report content. | Upload Higher Quality File, Contact Support |
| `/error/payment` | Your payment could not be completed. | Retry Payment, Change Payment Method |
| `/error/subscription-expired` | Your premium access has expired. | Renew Subscription, View Plans |
| `/error/doctor-unavailable` | This doctor is currently unavailable. | Browse Other Doctors, Request Notification |
| `/error/booking` | We couldn't complete your booking. | Choose Another Time, Retry Booking |
| `/error/chat-disconnected` | Connection to chat was interrupted. | Reconnect, Return Dashboard |
| `/error/file-too-large` | The uploaded file exceeds the allowed size. | Upload Smaller File, View Upload Requirements |
| `/error/file-type` | This file format is not supported. | View Supported Formats, Upload Another File |
| `/maintenance` | We're performing scheduled improvements. | Check Status Page, Notify Me When Back |
| `/offline` | No internet connection detected. | Retry Connection, View Cached Data |

## Recovery Components

- Unique healthcare-themed illustration/icon area per state.
- Friendly title and plain-language recovery description.
- Primary and secondary actions plus a consistent support path.
- Cooldown timer UI for `/error/429`.
- Countdown component for `/maintenance`.
- Gemini service status badge for `/error/ai`.
- Chat/offline connection status indicators for realtime/network failures.
- Report processing reasons and payment troubleshooting tips rendered as structured guidance.

## Compatibility

Legacy static paths under `public/error-state/*.html` are mapped into the new route-style SPA pages so older links continue to recover cleanly.
