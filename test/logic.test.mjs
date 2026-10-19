import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heartPoints, allViewed, whatsappUrl } from '../sky/logic.js';
test('counts can change without breaking heart layout or completion', () => {
  for (const count of [1,5,6,8,12,20]) {
    const points = heartPoints(count);
    assert.equal(points.length,count);
    assert.ok(points.every(p => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
    const stars = Array(count).fill({}); const viewed = new Set();
    assert.equal(allViewed(stars,viewed),false);
    for (let i=0;i<count-1;i++) viewed.add(i);
    assert.equal(allViewed(stars,viewed),false);
    viewed.add(count-1); assert.equal(allViewed(stars,viewed),true);
    viewed.add(count-1); assert.equal(viewed.size,count);
  }
  assert.equal(allViewed([],new Set()),false);
});
test('eight stars follow the pixel heart edges in symmetric pairs', () => {
  const points = heartPoints(8);
  for (const [right, left] of [[1,7],[2,6],[3,5]]) {
    assert.equal(points[right].x + points[left].x, 100);
    assert.equal(points[right].y, points[left].y);
  }
  assert.deepEqual(points[0], { x: 50, y: 30.75 });
  assert.deepEqual(points[4], { x: 50, y: 89.05 });
  assert.deepEqual(points[1], { x: 71, y: 13.2425 });
  assert.equal(points[2].y, 37.4);
  assert.deepEqual(points[3], { x: 70, y: 65.4575 });
});

test('WhatsApp links validate destination and encode the message', () => {
  assert.equal(whatsappUrl('','hi'),null);
  assert.equal(whatsappUrl('javascript:alert(1)','hi'),null);
  assert.equal(whatsappUrl('919876543210','us 💛'), 'https://wa.me/919876543210?text=us%20%F0%9F%92%9B');
});
test('six stars include a centred bottom tip and symmetric pairs', () => {
  const p = heartPoints(6);
  assert.equal(p[5].x,50);
  assert.ok(p[5].y > Math.max(...p.slice(0,5).map(point=>point.y)));
  assert.ok(Math.abs(p[1].x+p[4].x-100)<0.0001);
  assert.ok(Math.abs(p[2].x+p[3].x-100)<0.0001);
});

