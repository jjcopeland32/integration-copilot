# Validator Middleware Examples

## Express
```ts
import express from 'express';
import { createValidator } from '@/packages/validator/src/middleware/express';

const app = express();
app.use(express.json());

app.use(createValidator({
  projectId: 'proj_demo',
  telemetryUrl: process.env.APP_URL + '/api/trace',
  signingSecret: process.env.TELEMETRY_SIGNING_SECRET!,
  schemaRef: '#/components/schemas/Charge',
  rules: { requireIdempotencyKey: true },
  redact: { fields: ['cardNumber', 'cvv'] },
}));

app.post('/charges', (req, res) => {
  res.status(200).send({ id: 'ch_123', status: 'succeeded' });
});

app.listen(3001, () => console.log('Mock app on 3001'));
```

## Next.js (App Router)
```ts
// app/api/charges/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withValidator } from '@/packages/validator/src/middleware/next-api';

async function handler(req: NextRequest) {
  return NextResponse.json({ id: 'ch_123', status: 'succeeded' }, { status: 200 });
}

export const POST = withValidator(handler, {
  projectId: 'proj_demo',
  telemetryUrl: process.env.APP_URL + '/api/trace',
  signingSecret: process.env.TELEMETRY_SIGNING_SECRET!,
  schemaRef: '#/components/schemas/Charge',
  rules: { requireIdempotencyKey: true },
});
```
