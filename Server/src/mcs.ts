import { FastifyInstance } from 'fastify';

type AllowedMode = 'energy' | 'soc' | 'time';

type TargetSpec = {
  mode: AllowedMode;
  value: number;
  ready_by: string;
};

type ConstraintSpec = {
  max_power_kw?: number;
  min_power_kw?: number;
  grid_limit_kw?: number;
};

type Profile = {
  id?: string;
  target: TargetSpec;
  constraints?: ConstraintSpec;
};

type CurrentState = {
  soc?: number;
  battery_kwh?: number;
};

type PlanBucket = {
  start: string;
  power_kw: number;
};

type Plan = {
  profile_id?: string;
  created_at: string;
  buckets: PlanBucket[];
};

const BUCKET_MINUTES = 15;

function parseIso(dt: string): Date {
  return new Date(dt);
}

function generateTimeBuckets(start: Date, end: Date, minutes = BUCKET_MINUTES): Date[] {
  const buckets: Date[] = [];
  let cur = start;
  while (cur < end) {
    buckets.push(cur);
    cur = new Date(cur.getTime() + minutes * 60 * 1000);
  }
  return buckets;
}

export function simplePlan(profile: Profile, currentState: CurrentState, now = new Date()): Plan {
  const target = profile.target ?? {
    mode: 'energy',
    value: 0,
    ready_by: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
  };
  const constraints = profile.constraints ?? {};
  const maxPowerKw = constraints.max_power_kw ?? 50;
  const gridLimitKw = constraints.grid_limit_kw ?? maxPowerKw;

  let remainingKwh = 0;
  if (target.mode === 'energy') {
    const energyKwh = target.value ?? 0;
    const batteryKwh = currentState.battery_kwh ?? energyKwh ?? 50;
    const soc = currentState.soc ?? 0;
    remainingKwh = Math.max(0, energyKwh - (soc / 100) * batteryKwh);
  } else if (target.mode === 'soc') {
    const desiredSoc = target.value ?? 100;
    const batteryKwh = currentState.battery_kwh ?? 50;
    const soc = currentState.soc ?? 0;
    remainingKwh = Math.max(0, (desiredSoc / 100 - soc / 100) * batteryKwh);
  }

  const readyBy = target.ready_by
    ? parseIso(target.ready_by)
    : new Date(now.getTime() + 2 * 3600 * 1000);
  const buckets = generateTimeBuckets(now, readyBy);

  let planBuckets: PlanBucket[] = [];
  if (remainingKwh <= 0 || buckets.length === 0) {
    planBuckets = buckets.map((b) => ({ start: b.toISOString(), power_kw: 0 }));
  } else {
    const energyPerBucket = remainingKwh / Math.max(1, buckets.length);
    const hoursPerBucket = BUCKET_MINUTES / 60;
    planBuckets = buckets.map((b) => {
      const requiredKw = energyPerBucket / hoursPerBucket;
      const pw = Math.min(requiredKw, maxPowerKw, gridLimitKw);
      return { start: b.toISOString(), power_kw: Math.round(pw * 1000) / 1000 };
    });
  }

  return {
    profile_id: profile.id,
    created_at: now.toISOString(),
    buckets: planBuckets,
  };
}

export function registerMcsRoutes(server: FastifyInstance) {
  server.post<{ Body: { profile: Profile; currentState?: CurrentState } }>(
    '/api/mcs/profiles/simulate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['profile'],
          properties: {
            profile: { type: 'object' },
            currentState: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { profile, currentState = {} } = request.body;
      const plan = simplePlan(profile, currentState);
      return reply.send({ plan });
    },
  );

  server.post<{ Body: { profile: Profile; currentState?: CurrentState } }>(
    '/api/mcs/profiles/apply',
    {
      schema: {
        body: {
          type: 'object',
          required: ['profile'],
          properties: {
            profile: { type: 'object' },
            currentState: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { profile, currentState = {} } = request.body;
      const plan = simplePlan(profile, currentState);
      // TODO: integrate with CommandDispatcher to send SetChargingProfile
      return reply.send({ status: 'accepted', plan });
    },
  );
}
