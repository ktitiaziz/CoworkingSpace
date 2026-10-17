# Coworking Space frontend integration - first milestone

## Included
- Angular AuthService for `/auth/register`, `/auth/login`, `/auth/verify-code`, and `/auth/resend-code`.
- New `/auth` page with sign up, sign in, and six-digit verification UI.
- Access token stored in localStorage after successful LOGIN verification only.
- Login links on the home, spaces, and space details pages now open the auth page.
- Angular HttpClient configured.

## Run
1. Keep the NestJS backend running on `http://localhost:3000`.
2. From the frontend project folder, run `npm install` if needed.
3. Run `npm start` and open the URL shown by Angular (usually `http://localhost:4200`).
4. Click Login, or visit `/auth?mode=signup` to register.
5. Use an inbox you control. After registering, enter the emailed code on the verification screen.
6. After registration verification, sign in. Enter the separate LOGIN code. The JWT is stored only after successful LOGIN verification.

## API contract expected by this frontend
- POST `/auth/register`: `{ firstName, lastName, email, password }` returns `{ message, requiresVerification, purpose, email }`.
- POST `/auth/login`: `{ email, password }` returns `{ message, requiresVerification, purpose, email }`.
- POST `/auth/verify-code`: `{ email, code, purpose }`; registration returns a message, login returns `{ message, accessToken }`.
- POST `/auth/resend-code`: `{ email, purpose }`.

## If browser reports a CORS error
Postman does not enforce browser CORS. In NestJS `src/main.ts`, enable CORS before `listen`, for local development:

```ts
const app = await NestFactory.create(AppModule);
app.enableCors({ origin: 'http://localhost:4200' });
await app.listen(process.env.PORT ?? 3000);
```

Keep any existing app setup in `main.ts`; add `app.enableCors(...)` rather than replacing unrelated configuration.

## Notes
This is the authentication integration milestone. The spaces and reservation screens still use mock data and will be connected in the next milestone. Do not commit secrets. The token is stored in localStorage for this class-project flow; a production application should consider a more secure session design.
