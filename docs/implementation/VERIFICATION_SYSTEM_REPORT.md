# Verification System Report

## Scope

Doctors cannot self-register as users. Public applicants submit applications, and admins approve or reject them.

Implemented files:

- `src/repositories/recruitmentRepository.js`
- `src/services/recruitmentService.js`
- `src/validators/recruitmentValidators.js`
- `src/routes/recruitmentRoutes.js`
- `src/repositories/doctorRepository.js`
- `src/services/authService.js`

## Application Flow

Applicants submit:

- First name
- Last name
- Email
- Phone
- Medical license number
- Specialization
- Years of experience
- Document upload

Application statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`

## Verification Flow

Admins can:

- Create doctor accounts
- Approve applications
- Set verification status
- Suspend doctors

Verification statuses:

- `UNVERIFIED`
- `PENDING`
- `VERIFIED`
- `SUSPENDED`

Every verification change writes to `doctor_verification_logs`.

## Credential Flow

When an admin creates or approves a doctor, the system:

1. Creates a real `Doctor` user.
2. Creates a doctor profile.
3. Stores license and specialization fields.
4. Generates temporary credentials.
5. Sends credentials using the existing email service.

