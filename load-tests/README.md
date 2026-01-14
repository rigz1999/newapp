# Load Testing Suite

This directory contains load testing scripts for the Finixar application using [k6](https://k6.io/).

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
winget install k6 --source winget
```

**Docker:**
```bash
docker pull grafana/k6
```

## Configuration

Before running tests, configure your environment:

1. Set environment variables:
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
export TEST_USER_EMAIL=loadtest@example.com
export TEST_USER_PASSWORD=your-test-password
```

2. Or create a `.env.loadtest` file (not committed to git):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
TEST_USER_EMAIL=loadtest@example.com
TEST_USER_PASSWORD=your-test-password
```

### Create a Test User

Create a dedicated test user in your Supabase project for load testing. This user should:
- Have appropriate permissions to access the endpoints being tested
- Be part of a test organization
- NOT be a real user account

## Available Tests

### 1. Smoke Test
Quick validation to ensure the system is working correctly.
```bash
npm run loadtest:smoke
# or
k6 run load-tests/tests/smoke-test.js
```
- **Duration:** ~1 minute
- **VUs:** 1
- **Purpose:** Verify basic functionality before running heavier tests

### 2. API Endpoints Test
Tests the main REST API endpoints for performance.
```bash
npm run loadtest:api
# or
k6 run load-tests/tests/api-endpoints.js
```
- **Duration:** ~3 minutes
- **VUs:** 1-10 (ramping)
- **Purpose:** Measure individual endpoint performance

### 3. User Flows Test
Simulates complete user journeys through the application.
```bash
npm run loadtest:flows
# or
k6 run load-tests/tests/user-flows.js
```
- **Duration:** ~5 minutes
- **VUs:** 1-10 (ramping)
- **Purpose:** Test realistic user behavior patterns

### 4. Stress Test
Tests system behavior under extreme load to find breaking points.
```bash
npm run loadtest:stress
# or
k6 run load-tests/tests/stress-test.js
```
- **Duration:** ~30 minutes
- **VUs:** 0-150 (ramping)
- **Purpose:** Find system limits and breaking points

### 5. Spike Test
Tests system behavior under sudden traffic spikes.
```bash
npm run loadtest:spike
# or
k6 run load-tests/tests/spike-test.js
```
- **Duration:** ~3 minutes
- **VUs:** 5-100 (sudden spike)
- **Purpose:** Test auto-scaling and spike handling

### 6. Soak Test
Tests system behavior under sustained load over time.
```bash
npm run loadtest:soak
# or
k6 run load-tests/tests/soak-test.js
```
- **Duration:** ~1 hour
- **VUs:** 20 (sustained)
- **Purpose:** Detect memory leaks, connection exhaustion, etc.

## Running Tests

### With npm scripts:
```bash
# Run smoke test first
npm run loadtest:smoke

# Run API endpoint tests
npm run loadtest:api

# Run all tests sequentially
npm run loadtest:all
```

### With environment variables:
```bash
k6 run -e SUPABASE_URL=https://xxx.supabase.co -e SUPABASE_ANON_KEY=xxx load-tests/tests/smoke-test.js
```

### With Docker:
```bash
docker run --rm -i grafana/k6 run - <load-tests/tests/smoke-test.js
```

### Output to JSON:
```bash
k6 run --out json=results.json load-tests/tests/api-endpoints.js
```

### With InfluxDB (for Grafana dashboards):
```bash
k6 run --out influxdb=http://localhost:8086/k6 load-tests/tests/api-endpoints.js
```

## Test Thresholds

Default thresholds are configured in each test file:

| Metric | Smoke | Load | Stress |
|--------|-------|------|--------|
| p(95) Response Time | <3s | <2s | <5s |
| p(99) Response Time | <3s | <5s | <10s |
| Error Rate | <1% | <1% | <10% |

## Custom Metrics

Each test tracks custom metrics:
- `error_rate` - Percentage of failed checks
- `response_times` - Trend of response durations
- `login_duration` - Authentication timing
- `dashboard_load_duration` - Dashboard batch load timing
- `projects_latency` - Projects endpoint latency
- `investors_latency` - Investors endpoint latency
- `payments_latency` - Payments endpoint latency

## Interpreting Results

### Key Metrics to Watch:
1. **http_req_duration** - How long requests take
2. **http_req_failed** - Percentage of failed requests
3. **vus** - Number of virtual users
4. **iterations** - Total completed iterations

### Example Output:
```
✓ checks.........................: 100.00% ✓ 1250 ✗ 0
  data_received..................: 15 MB   250 kB/s
  data_sent......................: 500 kB  8.3 kB/s
  http_req_blocked...............: avg=1.5ms   p(95)=5ms
  http_req_duration..............: avg=150ms   p(95)=500ms   p(99)=1s
  http_reqs......................: 1250    20.8/s
  iterations.....................: 250     4.17/s
  vus............................: 10      min=1 max=10
```

### What Good Results Look Like:
- ✓ All checks passing (100%)
- p(95) response time under threshold
- Error rate below threshold
- Consistent response times (low std deviation)

### Warning Signs:
- ✗ Failed checks
- Response times increasing over time (in soak tests)
- Error rate spiking during ramp-up
- Inconsistent response times

## Directory Structure

```
load-tests/
├── README.md           # This file
├── config.js           # Configuration and endpoints
├── utils/
│   └── helpers.js      # Shared utility functions
└── tests/
    ├── smoke-test.js   # Quick validation
    ├── api-endpoints.js # API performance test
    ├── user-flows.js   # User journey test
    ├── stress-test.js  # Find breaking points
    ├── spike-test.js   # Sudden traffic test
    └── soak-test.js    # Extended duration test
```

## Best Practices

1. **Always run smoke test first** to verify the system is working
2. **Use dedicated test users** - never use real user accounts
3. **Run tests against staging** before production
4. **Monitor your database** during tests for query performance
5. **Start with low VUs** and gradually increase
6. **Schedule soak tests** during off-peak hours
7. **Save results** for historical comparison

## Troubleshooting

### "Authentication failed"
- Verify test user credentials
- Check if test user exists in Supabase
- Ensure test user has correct permissions

### "Connection refused"
- Verify SUPABASE_URL is correct
- Check if Supabase project is active
- Verify network connectivity

### "Rate limited"
- Reduce VUs or add more sleep time
- Check Supabase rate limiting settings
- Use connection pooling

### High error rates
- Check Supabase logs for errors
- Verify database connection limits
- Review query performance
