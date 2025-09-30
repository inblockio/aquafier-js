import t from 'tap';

t.test('smoke: basic sanity check', t => {
  t.plan(3);
  t.ok(true, 'truthiness works');
  t.equal(1 + 1, 2, 'basic arithmetic');
  t.same({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] }, 'deep equality works');
});
