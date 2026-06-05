# WebSocket Architecture

## Transport

The realtime layer uses Socket.io on the existing HTTP server. The server is initialized by `src/sockets/index.js`, which delegates to `src/realtime/socketServer.js`.

## Authentication

`src/realtime/authSocketMiddleware.js` authenticates every connection with a JWT access token from:

- `socket.handshake.auth.token`
- `Authorization: Bearer <token>`

The middleware verifies the token with `JWT_ACCESS_SECRET`, loads the user from the database, rejects unauthorized sockets, and avoids exposing stack traces or secrets.

## Authorization

Room access is enforced in `src/realtime/roomManager.js`.

Rules:

- Users join only their own `user:{userId}` room.
- Doctors join `doctor:{doctorId}` only when their role is `Doctor`.
- Admins join `admin:global` only when their role is `Admin`.
- Appointment rooms require patient, doctor, or admin access.
- Chat rooms require consultation participant or admin access.

## Presence

`src/realtime/presenceManager.js` tracks online sockets, doctor availability, and last-seen timestamps in memory, while persisting presence activity to `presence_logs`.

This is ready for future horizontal scaling by replacing the in-memory maps with Redis-backed presence state and adding the Socket.io Redis adapter.

## Event Broadcasting

`src/sockets/hub.js` provides targeted emit helpers:

- `toUser`
- `toDoctor`
- `toAppointment`
- `toConsultation`
- `toAdmins`

The implementation avoids global broadcasts except for admin dashboard events.

## Database Support

Migration `src/migrations/006_realtime_system.sql` adds:

- `chat_sessions`
- `notification_events`
- `presence_logs`
- `message_delivery_status`
- `chat_messages.chat_session_id`

No existing data is destroyed.

