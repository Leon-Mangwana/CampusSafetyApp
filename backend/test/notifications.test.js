const request = require('supertest');
const { setupApp, iso } = require('./helpers/app');

describe('notification routes', () => {
  let ctx;
  beforeEach(() => {
    ctx = setupApp({
      notifications: {
        n1: { notificationId: 'n1', recipientId: 'student2', message: 'a', isRead: false, timestamp: iso(2000) },
        n2: { notificationId: 'n2', recipientId: 'student2', message: 'b', isRead: false, timestamp: iso(1000) },
        n3: { notificationId: 'n3', recipientId: 'student1', message: 'c', isRead: false, timestamp: iso(500) },
      },
    });
  });

  const as = (who) => `Bearer ${ctx.tokens[who]}`;

  it('lists only the caller’s notifications, newest first', async () => {
    const res = await request(ctx.app).get('/api/notifications').set('Authorization', as('student2'));
    expect(res.status).toBe(200);
    expect(res.body.notifications.map((n) => n.notificationId)).toEqual(['n2', 'n1']);
  });

  it('enforces ownership on mark-as-read', async () => {
    expect((await request(ctx.app).put('/api/notifications/n1/read').set('Authorization', as('student1'))).status).toBe(403);
    expect((await request(ctx.app).put('/api/notifications/missing/read').set('Authorization', as('student1'))).status).toBe(404);
    expect((await request(ctx.app).put('/api/notifications/n1/read').set('Authorization', as('student2'))).status).toBe(200);
    expect(ctx.db._get('notifications/n1/isRead')).toBe(true);
    expect(ctx.db._get('notifications/n2/isRead')).toBe(false);
  });

  it('marks all of the caller’s notifications read and nobody else’s', async () => {
    const res = await request(ctx.app).put('/api/notifications/read-all').set('Authorization', as('student2'));
    expect(res.status).toBe(200);
    expect(ctx.db._get('notifications/n1/isRead')).toBe(true);
    expect(ctx.db._get('notifications/n2/isRead')).toBe(true);
    expect(ctx.db._get('notifications/n3/isRead')).toBe(false);
  });
});
