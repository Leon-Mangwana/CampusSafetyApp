const request = require('supertest');
const { setupApp, iso } = require('./helpers/app');

describe('SOS routes', () => {
  let ctx;
  beforeEach(() => {
    ctx = setupApp();
  });

  const post = (body, who = 'student1') =>
    request(ctx.app).post('/api/sos').set('Authorization', `Bearer ${ctx.tokens[who]}`).send(body);

  it('accepts an SOS without coordinates and flags it', async () => {
    const res = await post({});
    expect(res.status).toBe(201);
    expect(res.body.locationStatus).toBe('none');
    const alert = ctx.db._get(`sosAlerts/${res.body.alertId}`);
    expect(alert.latitude).toBeNull();
    expect(alert.userPhone).toBe('0771234567');
    expect(alert.status).toBe('active');
  });

  it('accepts zero coordinates and rejects invalid ones', async () => {
    expect((await post({ latitude: 0, longitude: 0 })).status).toBe(201);
    expect((await post({ latitude: 'abc', longitude: 1 })).status).toBe(400);
    expect((await post({ latitude: 91, longitude: 1 })).status).toBe(400);
  });

  it('records the location source and accuracy', async () => {
    const res = await post({ latitude: -19.5, longitude: 29.8, accuracy: 12.7, locationSource: 'last_known' });
    const alert = ctx.db._get(`sosAlerts/${res.body.alertId}`);
    expect(alert.locationStatus).toBe('last_known');
    expect(alert.accuracy).toBe(13);
  });

  it('notifies officers in-app and by push without leaking coordinates', async () => {
    const res = await post({ latitude: -19.5176, longitude: 29.8331 });
    const notes = Object.values(ctx.db._get('notifications') || {});
    const officerNote = notes.find((n) => n.recipientId === 'officer1');
    expect(officerNote).toBeDefined();
    expect(officerNote.incidentId).toBe(res.body.alertId);
    expect(officerNote.message).not.toMatch(/19\.5/);
    const push = ctx.sentPush.find((m) => m.to === 'ExponentPushToken[o1]');
    expect(push).toBeDefined();
    expect(push.channelId).toBe('sos');
    expect(push.data).toMatchObject({ alertId: res.body.alertId, type: 'sos' });
    expect(push.data).not.toHaveProperty('latitude');
  });

  it('rate-limits per user, not per network, and ignores failed attempts', async () => {
    await post({ latitude: 'bad', longitude: 1 }); // 400 — must not count
    expect((await post({})).status).toBe(201);
    expect((await post({})).status).toBe(201);
    expect((await post({})).status).toBe(201);
    expect((await post({})).status).toBe(429);
    // A different student on the same IP is unaffected.
    expect((await post({}, 'student2')).status).toBe(201);
  });

  describe('ownership', () => {
    let alertId;
    beforeEach(async () => {
      alertId = (await post({ latitude: -19.5, longitude: 29.8 })).body.alertId;
    });

    it('only the owner can update location or cancel', async () => {
      const other = `Bearer ${ctx.tokens.student2}`;
      const owner = `Bearer ${ctx.tokens.student1}`;
      expect((await request(ctx.app).put(`/api/sos/${alertId}/location`).set('Authorization', other).send({ latitude: 1, longitude: 1 })).status).toBe(403);
      expect((await request(ctx.app).put(`/api/sos/${alertId}/cancel`).set('Authorization', other)).status).toBe(403);
      expect((await request(ctx.app).put(`/api/sos/${alertId}/location`).set('Authorization', owner).send({ latitude: -19.4, longitude: 29.9, accuracy: 5 })).status).toBe(200);
      expect(ctx.db._get(`sosAlerts/${alertId}`)).toMatchObject({ latitude: -19.4, longitude: 29.9, accuracy: 5, locationStatus: 'gps' });
      expect((await request(ctx.app).put(`/api/sos/${alertId}/cancel`).set('Authorization', owner)).status).toBe(200);
      expect(ctx.db._get(`sosAlerts/${alertId}/status`)).toBe('closed');
      // Closed alerts no longer accept location updates.
      expect((await request(ctx.app).put(`/api/sos/${alertId}/location`).set('Authorization', owner).send({ latitude: 1, longitude: 1 })).status).toBe(409);
    });

    it('only staff can list and resolve; resolving pushes the student', async () => {
      expect((await request(ctx.app).get('/api/sos').set('Authorization', `Bearer ${ctx.tokens.student1}`)).status).toBe(403);
      expect((await request(ctx.app).put(`/api/sos/${alertId}/resolve`).set('Authorization', `Bearer ${ctx.tokens.student1}`).send({ status: 'responded' })).status).toBe(403);

      const list = await request(ctx.app).get('/api/sos?status=active').set('Authorization', `Bearer ${ctx.tokens.officer1}`);
      expect(list.status).toBe(200);
      expect(list.body.alerts.map((a) => a.alertId)).toContain(alertId);

      ctx.sentPush.length = 0;
      const res = await request(ctx.app).put(`/api/sos/${alertId}/resolve`).set('Authorization', `Bearer ${ctx.tokens.officer1}`).send({ status: 'responded' });
      expect(res.status).toBe(200);
      expect(ctx.db._get(`sosAlerts/${alertId}/status`)).toBe('responded');
      expect(ctx.sentPush.some((m) => m.to === 'ExponentPushToken[s1]')).toBe(true);
      expect((await request(ctx.app).put(`/api/sos/${alertId}/resolve`).set('Authorization', `Bearer ${ctx.tokens.officer1}`).send({ status: 'nope' })).status).toBe(400);
    });
  });

  it('lists newest first and honours the status filter', async () => {
    ctx.db._set('sosAlerts', {
      a: { alertId: 'a', userId: 'x', status: 'active', timestamp: iso(3000) },
      b: { alertId: 'b', userId: 'x', status: 'closed', timestamp: iso(1000) },
      c: { alertId: 'c', userId: 'x', status: 'active', timestamp: iso(2000) },
    });
    const all = await request(ctx.app).get('/api/sos').set('Authorization', `Bearer ${ctx.tokens.officer1}`);
    expect(all.body.alerts.map((a) => a.alertId)).toEqual(['b', 'c', 'a']);
    const active = await request(ctx.app).get('/api/sos?status=active').set('Authorization', `Bearer ${ctx.tokens.officer1}`);
    expect(active.body.alerts.map((a) => a.alertId)).toEqual(['c', 'a']);
  });
});
