# Security Specification: MiniTube AI

## 1. Data Invariants
- User playlists must be owned by the user who created them.
- History entries must correspond to the authenticated user.
- Videos in playlists must have valid YouTube IDs.
- Timestamps must be validated using server-side `request.time`.

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. Creating a playlist for another user (`userId` mismatch).
2. Updating `userId` on an existing playlist (Identity spoofing).
3. Adding 5000 videos to a playlist (Resource exhaustion).
4. Creating a history entry without being signed in.
5. Updating `watchedAt` to a future date.
6. Deleting a playlist that doesn't belong to the user.
7. Listing all playlists without a user filter (Query scraping).
8. Injecting a 2MB string into playlist `name`.
9. Modifying `historyId` document ID to a non-standard string.
10. Creating a playlist with no `videos` field (Schema violation).
11. Bypassing `email_verified` check (if enabled).
12. Updating `createdAt` field after creation (Immutability).

## 3. Test Runner (Conceptual)
All the above payloads will return `PERMISSION_DENIED` based on the security rules implemented.
