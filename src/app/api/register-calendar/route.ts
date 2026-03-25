import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const DAY_MAP: Record<string, number> = { 月: 1, 火: 2, 水: 3, 木: 4, 金: 5 };
const RRULE_DAY: Record<string, string> = { 月: "MO", 火: "TU", 水: "WE", 木: "TH", 金: "FR" };

// YYYY-MM-DD と HH:MM から Asia/Tokyo のdateTime文字列を作る
// toISOStringを使わず、文字列として直接組み立てることでタイムゾーンズレを防ぐ
function toJSTDateTimeString(dateStr: string, timeStr: string): string {
  // "2026-04-07" + "09:00" → "2026-04-07T09:00:00+09:00"
  return `${dateStr}T${timeStr}:00+09:00`;
}

// YYYY-MM-DD文字列の日付を1日ずつ進める
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 曜日番号を返す（日=0, 月=1...）JST基準
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00+09:00").getDay();
}

export async function POST(req: NextRequest) {
  const { timeMaster, timetable, semesterStart, semesterEnd, accessToken } = await req.json();

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const timeMap: Record<number, { start: string; end: string }> = {};
  timeMaster.forEach((row: any) => {
    timeMap[row.period] = { start: row.start, end: row.end };
  });

  let count = 0;
  const errors: string[] = [];

  for (const lesson of timetable) {
    const times = timeMap[lesson.period];
    if (!times) {
      errors.push(`時限マスタに ${lesson.period} 限が見つかりません`);
      continue;
    }

    const targetDayNum = DAY_MAP[lesson.day];
    const rruleDay = RRULE_DAY[lesson.day];

    // 学期開始日から最初の該当曜日を探す（文字列ベースで処理）
    let firstDateStr = semesterStart;
    let attempts = 0;
    while (getDayOfWeek(firstDateStr) !== targetDayNum && attempts < 7) {
      firstDateStr = addDays(firstDateStr, 1);
      attempts++;
    }

    // 日本時間でdateTime文字列を直接組み立て
    const startDateTime = toJSTDateTimeString(firstDateStr, times.start);
    const endDateTime = toJSTDateTimeString(firstDateStr, times.end);

    // RRULE用のUNTIL（UTCで指定）
    const untilDate = semesterEnd.replace(/-/g, "") + "T145959Z"; // 23:59:59 JST = 14:59:59 UTC

    try {
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: lesson.title,
          location: lesson.location || "",
          colorId: lesson.colorId || undefined,
          start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
          end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
          recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${untilDate}`],
        },
      });
      count++;
    } catch (e: any) {
      errors.push(`登録エラー: ${lesson.title}（${lesson.day}曜 ${lesson.period}限）`);
    }
  }

  return NextResponse.json({ count, errors });
}
