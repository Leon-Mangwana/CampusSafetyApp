const request = require('supertest');
const { setupApp, iso, DAY } = require('./helpers/app');

const seedIncidents = () => ({
  // two reports in one ~55 m cell (publicly visible), one alone (hidden
  // from students), one older than the 90-day window (excluded)
  a: { incidentId: 'a', type: 'theft', severity: 'high', status: 'pending', latitude: -19.5176, longitude: 29.8331, timestamp: iso(DAY) },
  b: { incidentId: 'b', type: 'theft', severity: 'low', status: 'resolved', latitude: -19.51762, longitude: 29.83312, timestamp: iso(2 * DAY) },
  c: { incidentId: 'c', type: 'assault', severity: 'high', status: 'pending', latitude: -19.525, longitude: 29.84, timestamp: iso(3 * DAY) },
  old: { incidentId: 'old', type: 'theft', severity: 'high', status: 'resolved', latitude: -19.51761, longitude: 29.83311, timestamp: iso(200 * DAY) },
});

describe('incident routes', () => {
  let ctx;
  beforeEach(() => {
    ctx = setupApp({
      incidents: seedIncidents(),
      presence: {
        student2: { lat: -19.5176, lng: 29.8331, updatedAt: iso(60000) },
        student1: { lat: -19.5176, lng: 29.8331, updatedAt: iso(5 * 3600000) }, // stale
      },
    });
  });

  const as = (who) => `Bearer ${ctx.tokens[who]}`;

  describe('POST /api/incidents', () => {
    const body = { type: 'theft', description: 'My bag was stolen near the library.', latitude: -19.5, longitude: 29.8 };

    it('validates input', async () => {
      const cases = [
        { ...body, type: 'nope' },
        { ...body, description: 'short' },
        { ...body, description: 'x'.repeat(1001) },
        { ...body, latitude: 'abc' },
        { ...body, latitude: undefined, longitude: undefined },
      ];
      for (const c of cases) {
        expect((await request(ctx.app).post('/api/incidents').set('Authorization', as('student1')).send(c)).status).toBe(400);
      }
    });

    it('computes severity on the server and ignores the client value', async () => {
      const res = await request(ctx.app).post('/api/incidents').set('Authorization', as('student1'))
        .send({ ...body, type: 'vandalism', description: 'Someone sprayed graffiti on the library wall.', severity: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.severity).not.toBe('high');
      const stored = ctx.db._get(`incidents/${res.body.incidentId}`);
      expect(stored.severity).toBe(res.body.severity);
      expect(stored.userId).toBeNull();
      expect(stored).not.toHaveProperty('imageUrl');
    });

    it('notifies officers and, for high severity, only fresh nearby presence', async () => {
      ctx.sentPush.length = 0;
      const res = await request(ctx.app).post('/api/incidents').set('Authorization', as('student1'))
        .send({ ...body, type: 'assault', description: 'A man with a knife attacked a student near the hostel gate, she is bleeding.', latitude: -19.5176, longitude: 29.8331 });
      expect(res.body.severity).toBe('high');
      expect(ctx.sentPush.some((m) => m.to === 'ExponentPushToken[o1]' && m.data.type === 'incident')).toBe(true);
      const nearby = ctx.sentPush.filter((m) => m.data.type === 'nearby');
      expect(nearby.map((m) => m.to)).toEqual(['ExponentPushToken[s2]']);
      const notes = Object.values(ctx.db._get('notifications'));
      expect(notes.some((n) => n.recipientId === 'officer1' && n.incidentId === res.body.incidentId)).toBe(true);
    });

    it('applies the per-user report limit', async () => {
      for (let i = 0; i < 10; i++) {
        expect((await request(ctx.app).post('/api/incidents').set('Authorization', as('student1')).send(body)).status).toBe(201);
      }
      expect((await request(ctx.app).post('/api/incidents').set('Authorization', as('student1')).send(body)).status).toBe(429);
      expect((await request(ctx.app).post('/api/incidents').set('Authorization', as('student2')).send(body)).status).toBe(201);
    });
  });

  describe('raw incident access', () => {
    it('is staff only', async () => {
      expect((await request(ctx.app).get('/api/incidents').set('Authorization', as('student1'))).status).toBe(403);
      expect((await request(ctx.app).get('/api/incidents/a').set('Authorization', as('student1'))).status).toBe(403);
      expect((await request(ctx.app).put('/api/incidents/a/status').set('Authorization', as('student1')).send({ status: 'resolved' })).status).toBe(403);
      expect((await request(ctx.app).delete('/api/incidents/a').set('Authorization', as('student1'))).status).toBe(403);
    });

    it('lists newest first, caps the limit and filters by status', async () => {
      const res = await request(ctx.app).get('/api/incidents?limit=99999').set('Authorization', as('officer1'));
      expect(res.status).toBe(200);
      expect(res.body.incidents.map((i) => i.incidentId)).toEqual(['a', 'b', 'c', 'old']);
      const pending = await request(ctx.app).get('/api/incidents?status=pending').set('Authorization', as('officer1'));
      expect(pending.body.incidents.map((i) => i.incidentId)).toEqual(['a', 'c']);
      const typed = await request(ctx.app).get('/api/incidents?type=assault').set('Authorization', as('officer1'));
      expect(typed.body.incidents.map((i) => i.incidentId)).toEqual(['c']);
    });

    it('updates status with an audit record and deletes', async () => {
      const upd = await request(ctx.app).put('/api/incidents/a/status').set('Authorization', as('officer1')).send({ status: 'resolved' });
      expect(upd.status).toBe(200);
      expect(ctx.db._get('incidents/a/status')).toBe('resolved');
      expect(Object.values(ctx.db._get('responses')).some((r) => r.incidentId === 'a' && r.officerId === 'officer1')).toBe(true);
      expect((await request(ctx.app).put('/api/incidents/a/status').set('Authorization', as('officer1')).send({ status: 'weird' })).status).toBe(400);
      expect((await request(ctx.app).delete('/api/incidents/a').set('Authorization', as('officer1'))).status).toBe(200);
      expect(ctx.db._get('incidents/a')).toBeNull();
      expect((await request(ctx.app).delete('/api/incidents/a').set('Authorization', as('officer1'))).status).toBe(404);
    });
  });

  describe('GET /api/incidents/heatmap', () => {
    it('gives students aggregated cells with at least two reports', async () => {
      const res = await request(ctx.app).get('/api/incidents/heatmap').set('Authorization', as('student1'));
      expect(res.status).toBe(200);
      expect(res.body.precision).toBe('grid');
      expect(res.body.total).toBe(1);
      const cell = res.body.dataPoints[0];
      expect(cell.count).toBe(2);
      expect(cell).not.toHaveProperty('type');
      expect(cell.latitude).not.toBe(-19.5176);
    });

    it('ignores precision=full for students but honours it for staff', async () => {
      const s = await request(ctx.app).get('/api/incidents/heatmap?precision=full').set('Authorization', as('student1'));
      expect(s.body.precision).toBe('grid');
      const o = await request(ctx.app).get('/api/incidents/heatmap?precision=full').set('Authorization', as('officer1'));
      expect(o.body.precision).toBe('full');
      expect(o.body.total).toBe(3); // 200-day-old excluded
      expect(o.body.dataPoints[0]).toHaveProperty('severity');
    });

    it('filters by type', async () => {
      const res = await request(ctx.app).get('/api/incidents/heatmap?type=assault').set('Authorization', as('student1'));
      expect(res.body.total).toBe(0); // the lone assault is hidden from students
    });
  });

  describe('GET /api/incidents/stats', () => {
    it('is available to students with aggregated hotspots', async () => {
      const res = await request(ctx.app).get('/api/incidents/stats').set('Authorization', as('student1'));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.hotspots).toHaveLength(1);
      expect(res.body.hotspots[0]).not.toHaveProperty('types');
      expect(res.body.bySeverity).toEqual({ low: 1, medium: 0, high: 2 });
    });

    it('gives staff every cell with type breakdowns', async () => {
      const res = await request(ctx.app).get('/api/incidents/stats').set('Authorization', as('officer1'));
      expect(res.body.hotspots).toHaveLength(2);
      expect(res.body.hotspots[0].types).toEqual({ theft: 2 });
    });
  });

  describe('GET /api/incidents/report/monthly', () => {
    it('is staff only and reports this month', async () => {
      expect((await request(ctx.app).get('/api/incidents/report/monthly').set('Authorization', as('student1'))).status).toBe(403);
      const d = new Date();
      const res = await request(ctx.app)
        .get(`/api/incidents/report/monthly?month=${d.getMonth() + 1}&year=${d.getFullYear()}`)
        .set('Authorization', as('officer1'));
      expect(res.status).toBe(200);
      expect(res.body.month).toBe(d.getMonth() + 1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.topHotspot).toHaveProperty('count');
      expect(res.body.trend).toHaveProperty('direction');
    });
  });
});
