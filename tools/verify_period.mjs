/* التحقق من حدود انقلاب الصباح/المساء — يشغَّل مع TZ=Asia/Qatar */
const RealDate = Date;
const CASES = [
  ['04:59', 'evening'],
  ['05:00', 'morning'], // الحالة التي سأل عنها المستخدم
  ['05:01', 'morning'],
  ['11:59', 'morning'],
  ['12:00', 'evening'],
  ['23:30', 'evening'],
  ['00:30', 'evening'], // بالتصميم: وِرد المساء يمتد حتى الفجر
];

let fails = 0;
for (const [time, want] of CASES) {
  const stamp = `2026-09-26T${time}:00`; // تُفسَّر بالتوقيت المحلي للعملية (قطر عبر TZ)
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length === 0) args = [stamp]; super(...args); }
    static now() { return new RealDate(stamp).getTime(); }
  }
  globalThis.Date = FakeDate;
  const { store } = await import('../src/store.js');
  store.init();
  store.setSetting('timeMode', 'auto');
  const got = store.activePeriods[0];
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${time} بتوقيت قطر → ${got === 'morning' ? 'الصباح' : 'المساء'} (المتوقع: ${want === 'morning' ? 'الصباح' : 'المساء'})`);
  globalThis.Date = RealDate;
}
process.exit(fails ? 1 : 0);
