# Cloudflare API Token Rotation Runbook

The Cloudflare API token used by this project was created in Task 0.2 (external, user-owned). Tokens must be rotated every 90 days to limit exposure.

**Next rotation due: 2026-08-05**

## Rotation Steps

1. Log in to the Cloudflare dashboard → My Profile → API Tokens.
2. Create a new token with the same permissions as the existing one (Zone:Read, Pages:Edit for the relevant account).
3. Update `CLOUDFLARE_API_TOKEN` in the production secret store (or `.env.local` for local dev).
4. Test the new token: `curl -H "Authorization: Bearer <new_token>" https://api.cloudflare.com/client/v4/user/tokens/verify`.
5. Delete the old token from the Cloudflare dashboard.
6. Update the rotation date in this file to `today + 90 days`.

## Notes

- Store the token in a password manager, not in any committed file.
- If the token is compromised before the 90-day window, revoke immediately and follow steps above.
