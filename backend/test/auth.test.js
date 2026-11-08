const request = require('supertest');
const { setupApp } = require('./helpers/app');

describe('auth routes', () => {
  let ctx;
  beforeEach(() => {
    ctx = setupApp();
  });

  describe('POST /api/auth/register', () => {
    const valid = { email: 'new@msu.ac.zw', password: 'secret1', fullName: 'New Person', phone: '0771111111' };

    it('creates a student and ignores a supplied role', async () => {
      const res = await request(ctx.app).post('/api/auth/register').send({ ...valid, role: 'admin' });
      expect(res.status).toBe(201);
      expect(ctx.db._get(`users/${res.body.userId}/role`)).toBe('student');
      expect(ctx.db._get(`users/${res.body.userId}/pushToken`)).toBeNull();
    });

    it.each([
      ['bad email', { ...valid, email: 'nope' }],
      ['short password', { ...valid, password: '123' }],
      ['long password', { ...valid, password: 'x'.repeat(129) }],
      ['short name', { ...valid, fullName: 'A' }],
      ['bad phone', { ...valid, phone: '12' }],
      ['bad contacts', { ...valid, emergencyContacts: [{ name: 'X', phone: '1' }] }],
      ['too many contacts', { ...valid, emergencyContacts: Array(6).fill({ name: 'X', phone: '0771111111' }) }],
    ])('rejects %s with 400', async (_label, body) => {
      const res = await request(ctx.app).post('/api/auth/register').send(body);
      expect(res.status).toBe(400);
    });

    it('returns 409 for a duplicate email', async () => {
      await request(ctx.app).post('/api/auth/register').send(valid);
      const res = await request(ctx.app).post('/api/auth/register').send(valid);
      expect(res.status).toBe(409);
    });
  });

  describe('authentication', () => {
    it('rejects missing and invalid tokens', async () => {
      expect((await request(ctx.app).get('/api/auth/profile')).status).toBe(401);
      expect((await request(ctx.app).get('/api/auth/profile').set('Authorization', 'Bearer junk')).status).toBe(401);
    });

    it('returns the profile without device/location internals', async () => {
      const res = await request(ctx.app).get('/api/auth/profile').set('Authorization', `Bearer ${ctx.tokens.officer1}`);
      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('Officer One');
      expect(res.body).not.toHaveProperty('pushToken');
    });
  });

  describe('PUT /api/auth/users/:uid/role', () => {
    it('forbids non-admins', async () => {
      const res = await request(ctx.app)
        .put('/api/auth/users/student1/role')
        .set('Authorization', `Bearer ${ctx.tokens.officer1}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
    });

    it('lets an admin promote and sets a custom claim', async () => {
      const res = await request(ctx.app)
        .put('/api/auth/users/student1/role')
        .set('Authorization', `Bearer ${ctx.tokens.admin1}`)
        .send({ role: 'security' });
      expect(res.status).toBe(200);
      expect(ctx.db._get('users/student1/role')).toBe('security');
      expect(ctx.auth._users.get('student1').customClaims).toEqual({ role: 'security' });
    });

    it('rejects invalid roles and self-changes', async () => {
      const bad = await request(ctx.app)
        .put('/api/auth/users/student1/role')
        .set('Authorization', `Bearer ${ctx.tokens.admin1}`)
        .send({ role: 'god' });
      expect(bad.status).toBe(400);
      const self = await request(ctx.app)
        .put('/api/auth/users/admin1/role')
        .set('Authorization', `Bearer ${ctx.tokens.admin1}`)
        .send({ role: 'student' });
      expect(self.status).toBe(400);
    });

    it('falls back to the database role when the token has no claim', async () => {
      const res = await request(ctx.app)
        .put('/api/auth/users/student1/role')
        .set('Authorization', `Bearer ${JSON.stringify({ uid: 'admin1' })}`)
        .send({ role: 'security' });
      expect(res.status).toBe(200);
    });
  });

  describe('push token and presence', () => {
    it('stores and clears a push token', async () => {
      const auth = `Bearer ${ctx.tokens.student1}`;
      expect((await request(ctx.app).put('/api/auth/push-token').set('Authorization', auth).send({ pushToken: 'ExponentPushToken[new]' })).status).toBe(200);
      expect(ctx.db._get('users/student1/pushToken')).toBe('ExponentPushToken[new]');
      expect((await request(ctx.app).put('/api/auth/push-token').set('Authorization', auth).send({ pushToken: null })).status).toBe(200);
      expect(ctx.db._get('users/student1/pushToken')).toBeNull();
      expect((await request(ctx.app).put('/api/auth/push-token').set('Authorization', auth).send({ pushToken: 42 })).status).toBe(400);
    });

    it('writes rounded presence to a separate node and can clear it', async () => {
      const auth = `Bearer ${ctx.tokens.student1}`;
      const ok = await request(ctx.app).put('/api/auth/location').set('Authorization', auth).send({ latitude: -19.517612345, longitude: 29.833187654 });
      expect(ok.status).toBe(200);
      expect(ctx.db._get('presence/student1')).toMatchObject({ lat: -19.5176, lng: 29.8332 });
      expect(ctx.db._get('users/student1/lastLatitude')).toBeNull();

      const bad = await request(ctx.app).put('/api/auth/location').set('Authorization', auth).send({ latitude: 'x', longitude: 1 });
      expect(bad.status).toBe(400);

      const zero = await request(ctx.app).put('/api/auth/location').set('Authorization', auth).send({ latitude: 0, longitude: 0 });
      expect(zero.status).toBe(200);

      expect((await request(ctx.app).delete('/api/auth/location').set('Authorization', auth)).status).toBe(200);
      expect(ctx.db._get('presence/student1')).toBeNull();
    });
  });
});
