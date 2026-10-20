const Generator = require('../../src/utils/generator');
test('codes preserve prefix, length and numeric format', () => {
  const generated = new Generator(7, 'number', 'W').create(100);
  expect(new Set(generated).size).toBe(100);
  expect(generated.every(code => /^W\d{7}$/.test(code))).toBe(true);
});
test('duplicate candidates are retried rather than included in a batch', () => {
  const generator = new Generator(5);
  generator.new = jest.fn().mockImplementationOnce(() => { generator.code = 'AAAAA'; })
    .mockImplementationOnce(() => { generator.code = 'AAAAA'; })
    .mockImplementationOnce(() => { generator.code = 'BBBBB'; });
  expect(generator.create(2)).toEqual(['AAAAA', 'BBBBB']);
});
test('impossible code quantities fail instead of looping forever', () => {
  expect(() => new Generator(1, 'number').create(11)).toThrow(RangeError);
});
