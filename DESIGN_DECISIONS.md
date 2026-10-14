# Vutto Auctions — Assumptions, Trade-offs, and Improvements

## 1. Product assumptions

Check these assumptions against the actual implementation and update this document if needed.

- Users authenticate before protected actions such as bidding.
- Auctions have scheduled, live, and ended states based on configured start/end times.
- The highest valid bid at auction close wins.
- The server is authoritative for bid validation and auction state.
- Real-time events help clients reflect auction updates without a full page refresh.

Policies such as self-bidding, minimum increments, tie-breaking, cancellation, and anti-sniping extensions should be documented as explicit product decisions only if implemented.

## 2. Architecture choices and trade-offs

| Choice | Benefit | Trade-off / limitation |
|---|---|---|
| React + Vite | Fast frontend development and builds | Client depends on API availability and robust error handling |
| Express REST API | Familiar, straightforward API structure | Validation, authorization, and error handling must be enforced consistently |
| MongoDB + Mongoose | Flexible document model and schema-based access | Cross-document consistency and concurrency need explicit handling |
| Socket.IO | Convenient real-time events and reconnection support | Multiple instances need shared pub/sub or an adapter |
| In-process lifecycle polling | Simple implementation with few moving parts | Depends on process uptime and is not inherently distributed |
| Vercel + Render + Atlas | Separate hosting responsibilities | More configuration dependencies; free tiers can sleep or impose limits |
| JWT authentication | Stateless API authentication | Revocation and browser token storage require deliberate security choices |

## 3. Security review checklist

Verify each item in code and deployment configuration before marking it complete:

- Passwords are hashed with bcryptjs and never logged or returned.
- JWTs use a strong backend-only secret and appropriate expiration/validation.
- Protected routes enforce authentication and role/ownership authorization server-side.
- Request bodies, IDs, bid amounts, and auction dates are validated.
- Bid and auction state cannot be manipulated solely through client-side state.
- Production CORS permits only intended origins.
- Secrets are not committed or exposed through `VITE_` variables.
- Login and bidding endpoints have appropriate abuse protection/rate limits.
- Uploads enforce file type/size restrictions if enabled.
- Production dependencies and logs are checked for vulnerabilities and accidental secret disclosure.

Do not claim an item is satisfied until its implementation or configuration has been checked.

## 4. Concurrent bidding and data consistency

Two bids may be accepted based on the same stale highest-bid value if validation and update are separate operations.

Recommended stronger design:
1. Validate the request and user permissions.
2. Use a transaction or conditional atomic update to accept a bid only if it exceeds the current highest bid and the auction remains live.
3. Persist the bid record consistently with the auction update.
4. Emit the Socket.IO event only after the successful write/commit.
5. Return a conflict response if the bid is no longer valid.

Test with simultaneous requests. Socket delivery alone does not guarantee database consistency.

## 5. Lifecycle reliability

In-process polling is simple for a small demonstration deployment, but depends on the backend process running.

Potential improvements:
- Make transitions idempotent.
- Use conditional state transitions so only one worker can claim a due auction.
- Record transition failures and retry safely.
- Consider a durable scheduler or queue as volume grows.
- Define behavior for auctions that end while the service is unavailable.

## 6. Scalability considerations

If usage grows, consider:
- MongoDB indexes for auction status, start/end times, and bid history queries.
- Pagination and filtering for auction listings.
- Socket.IO Redis adapter or shared pub/sub for multiple API instances.
- A coordinated lifecycle worker instead of an uncoordinated timer per instance.
- Load testing for concurrent bidding and many connected clients.
- Rate limiting, read caching where appropriate, and query-latency monitoring.
- Centralized logs, metrics, alerts, and error tracking.

These are future improvements unless already implemented and verified.

## 7. Observability

The health endpoint and hosting-provider logs provide basic operational troubleshooting. They are not a substitute for comprehensive monitoring.

Recommended additions include structured logs, request IDs, error tracking, latency/error metrics, database connection monitoring, lifecycle-job metrics, and alerts.

## 8. Deployment trade-offs

The application uses Vercel for the frontend, Render for the backend, and MongoDB Atlas for persistence. This is straightforward for a small project and separates frontend, API, and data hosting.

Potential limitations include cold starts/sleep on free tiers, provider-specific limits, and dependence on correct environment variables and CORS. Disclose these limitations rather than claiming guaranteed high availability.

## 9. Scope boundaries

This document does not claim that the project has been independently security-audited, load-tested, or proven highly available. List automated tests, coverage metrics, monitoring tools, payment features, identity verification, or advanced auction policies only if they actually exist and have been verified.
