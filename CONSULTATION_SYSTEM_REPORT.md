# Consultation System Report

## Scope

The system now supports appointment-backed consultation sessions and doctor-patient messaging.

Implemented files:

- `src/repositories/appointmentRepository.js`
- `src/services/appointmentService.js`
- `src/repositories/consultationRepository.js`
- `src/services/doctorMarketplaceService.js`
- `src/utils/messageCrypto.js`

## Appointment Rules

Implemented:

- Doctor selection is required.
- Only verified, accepting doctors can be booked.
- Patients cannot book unavailable slots.
- Double booking is prevented by availability checks and a partial unique index.
- Only assigned verified doctors can confirm appointments.

Appointment statuses:

- `PENDING`
- `CONFIRMED`
- `COMPLETED`
- `CANCELLED`

## Consultation Sessions

When a doctor confirms an appointment, the system creates a consultation room.

Session mode:

- `CHAT`
- `VIDEO_READY` future architecture support

## Messaging

Implemented:

- Session-scoped doctor-patient messages
- Message history
- Recipient mapping
- Notification creation
- Socket event emission
- AES-256-GCM encrypted message body at rest

Plain message content is returned only to authorized consultation participants.

