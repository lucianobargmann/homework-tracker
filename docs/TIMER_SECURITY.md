# Timer Security Implementation

## Overview

The homework tracker implements a secure timer system that prevents common timing attacks while providing accurate time display despite client-server clock differences.

## Security Threats Addressed

### 1. Client Clock Manipulation
**Threat**: Users could set their system clock backwards to gain extra time.
**Solution**: Server-authoritative timing with client-side offset calculation.

### 2. JavaScript Timer Manipulation
**Threat**: Users could pause JavaScript execution or modify timer variables.
**Solution**: Timer recalculates from server time on every tick, not incremental counting.

### 3. LocalStorage Tampering
**Threat**: Users could modify stored timer values.
**Solution**: LocalStorage is only used for persistence; actual time is always recalculated from server timestamps.

### 4. Browser Developer Tools
**Threat**: Users could modify variables or pause execution.
**Solution**: Timer logic is stateless and recalculates from authoritative server data.

## Implementation Details

### Server Time Synchronization

1. **Initial Sync**: On page load, client fetches server time via `/api/time`
2. **Offset Calculation**: `serverTimeOffset = serverTime - clientTime`
3. **Display Time**: `displayTime = clientTime + serverTimeOffset`

### Timer Logic

```typescript
// Secure timer calculation
const clientTime = Date.now()
const syncedTime = clientTime + serverTimeOffset
const elapsed = Math.floor((syncedTime - startTime.getTime()) / 1000)
const validElapsed = Math.max(0, elapsed) // Always positive
```

### Key Security Features

- **Server-Authoritative**: All timing decisions based on server timestamps
- **Stateless Calculation**: Timer doesn't increment; recalculates from start time
- **Offset-Based Display**: Client shows server time, not local time
- **Positive-Only Values**: `Math.max(0, elapsed)` prevents negative times
- **No Trust in Client**: LocalStorage and client state are never trusted

## API Endpoints

### `/api/time`
Returns current server time for synchronization:
```json
{
  "serverTime": "2025-01-01T10:00:00.000Z",
  "timestamp": 1704110400000
}
```

### `/api/candidate/profile`
Returns authoritative start/submit times from database.

## Attack Resistance

### Clock Manipulation Attack
```typescript
// User sets clock 1 hour back
const clientTime = Date.now() - 3600000 // 1 hour ago
const serverOffset = 0 // Normal server
const syncedTime = clientTime + serverOffset // Still 1 hour ago
// Timer shows correct server time, not manipulated client time
```

### JavaScript Pause Attack
```typescript
// Even if user pauses JavaScript for 10 minutes
// When resumed, timer recalculates from current server time
const elapsed = Math.floor((syncedTime - startTime.getTime()) / 1000)
// Shows actual elapsed time, not paused time
```

### LocalStorage Manipulation
```typescript
// User modifies localStorage to show 0 seconds
localStorage.setItem('assignment-timer', '0')
// Timer ignores localStorage and recalculates from server time
const actualElapsed = Math.floor((syncedTime - startTime.getTime()) / 1000)
```

## Testing

Comprehensive tests cover:
- Server-client time synchronization
- Clock manipulation resistance
- Negative time prevention
- Edge cases and extreme values

Run tests: `npm test -- --testPathPatterns=timer.test.tsx`

## Limitations

1. **Display Only**: Client timer is for display only; server validates all submissions
2. **Network Dependency**: Requires initial network call for time sync
3. **Precision**: Limited to second-level precision (sufficient for homework timing)

## Best Practices

1. **Never Trust Client Time**: All authoritative timing on server
2. **Recalculate, Don't Increment**: Stateless timer calculations
3. **Positive Values Only**: Always use `Math.max(0, elapsed)`
4. **Server Validation**: Final submission times validated server-side
5. **Audit Trail**: All timing events logged for security auditing
