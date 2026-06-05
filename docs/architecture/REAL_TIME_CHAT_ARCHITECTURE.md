# Real-Time Chat Architecture

## Transport

Socket.io is installed and registered against the HTTP server.

Implemented files:

- `src/sockets/index.js`
- `src/sockets/hub.js`
- `src/server.js`

## Authentication

Socket connections authenticate with the same JWT access token used by the API.

Authenticated sockets join:

- `user:{userId}`
- `role:{role}`

Consultation rooms require access validation before joining:

- `consultation:{sessionId}`

## Events

Implemented server-side emission support for:

- `doctor.availability.updated`
- `appointment.booked`
- `appointment.status.updated`
- `consultation.message.created`
- `consultation.typing`
- `doctor.verification.updated`
- `notification.created`

## Security Model

- Patients can join only their own consultation rooms.
- Doctors can join only assigned consultation rooms.
- Messages are encrypted before persistence.
- User rooms isolate direct notifications.
- Doctor role rooms support availability broadcasts without exposing patient data.

## Future Video Support

`consultation_sessions.mode` supports `VIDEO_READY`, allowing a video provider to be added without replacing the appointment/session model.

