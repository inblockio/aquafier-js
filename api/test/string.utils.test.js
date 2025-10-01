import t from 'tap';

// Testing frontend string utils from backend test suite
// These are pure functions with no external dependencies
const {
  capitalizeWords,
  convertTemplateNameToTitle,
  makeProperReadableWord,
  remove0xPrefix
} = await import('../../web/src/utils/string.utils.ts');

t.test('capitalizeWords', t => {
  t.plan(4);
  t.equal(capitalizeWords('hello world'), 'Hello World', 'capitalizes first letter of each word');
  t.equal(capitalizeWords('the quick brown fox'), 'The Quick Brown Fox', 'handles multiple words');
  t.equal(capitalizeWords('ALREADY CAPS'), 'ALREADY CAPS', 'preserves already capitalized text');
  t.equal(capitalizeWords(''), '', 'handles empty string');
});

t.test('convertTemplateNameToTitle', t => {
  t.plan(4);
  t.equal(convertTemplateNameToTitle('user_profile_form'), 'User Profile Form', 'converts snake_case to Title Case');
  t.equal(convertTemplateNameToTitle('simple_name'), 'Simple Name', 'handles two words');
  t.equal(convertTemplateNameToTitle('single'), 'Single', 'handles single word');
  t.equal(convertTemplateNameToTitle(''), '', 'handles empty string');
});

t.test('makeProperReadableWord', t => {
  t.plan(5);
  t.equal(makeProperReadableWord('hello_world'), 'Hello World', 'converts underscored word to readable');
  t.equal(makeProperReadableWord('first_name'), 'First Name', 'handles common field names');
  t.equal(makeProperReadableWord('single'), 'Single', 'handles single word without underscores');
  t.equal(makeProperReadableWord(''), '', 'handles empty string');
  t.equal(makeProperReadableWord(null), null, 'handles null input');
});

t.test('remove0xPrefix', t => {
  t.plan(4);
  t.equal(remove0xPrefix('0x1234abcd'), '1234abcd', 'removes 0x prefix from hex string');
  t.equal(remove0xPrefix('0xdeadbeef'), 'deadbeef', 'removes 0x prefix');
  t.equal(remove0xPrefix('1234abcd'), '1234abcd', 'leaves string without 0x prefix unchanged');
  t.equal(remove0xPrefix('0X1234'), '0X1234', 'only removes lowercase 0x prefix');
});
