# Chat System Report

## Implementation Summary

Implemented realtime patient-doctor chat over Socket.io with database persistence and room authorization.

## Chat Flow

1. Authenticated socket connects.
2. Client joins a consultation room with `join_consultation` or a chat room with `join_chat`.
3. Server verifies the user is a participant or admin.
4. Client emits `message_send`.
5. Server validates payload and rate limits the sender.
6. Message is encrypted and persisted through the consultation repository.
7. Message delivery status is recorded.
8. Server broadcasts `message_receive` to `chat:{chatSessionId}`.
9. Recipient receives a persisted `notification_push`.

## Persistence

Messages store:

- sender id
- receiver id
- consultation session id
- chat session id
- encrypted content
- timestamp
- read status

Delivery state is tracked in `message_delivery_status`.

## Security

Implemented:

- JWT-only socket access
- Server-side room authorization
- Payload validation
- Message rate limiting
- Encrypted persisted message content via the existing consultation encryption path
- Suspicious join and event activity logging

## Frontend Behavior

The frontend uses `window.medRealtime` from `public/assets/js/socket-client.js`.

Consultation rooms send messages through WebSockets and append received messages live without a page refresh.

