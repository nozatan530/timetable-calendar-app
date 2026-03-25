import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const DAY_MAP: Record<string, number> = { 月: 1, 火: 2, 水: 3, 木: 4, 金: 5 };
// RRULEで使う曜日コード
const RRULE_DAY: Record<string, string> = { 月: "MO", 火: "TU", 水: "WE", 木: "TH", 金: "FR" };

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

    const [sh, sm] = times.start.split(":").map(Number);
    const [eh, em] = times.end.split(":").map(Number);

    // 学期開始日から最初の該当曜日を探す
    let firstDate = new Date(semesterStart);
    while (firstDate.getDay() !== targetDayNum) {
      firstDate.setDate(firstDate.getDate() + 1);
    }

    // 学期終了日をRRULE用にYYYYMMDD形式に変換
    const untilDate = semesterEnd.replace(/-/g, "") + "T235959Z";

    const startDt = new Date(firstDate);
    startDt.setHours(sh, sm, 0, 0);
    const endDt = new Date(firstDate);
    endDt.setHours(eh, em, 0, 0);

    try {
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: lesson.title,
          location: lesson.location || "",
          colorId: lesson.colorId || undefined,
          start: { dateTime: startDt.toISOString(), timeZone: "Asia/Tokyo" },
          end: { dateTime: endDt.toISOString(), timeZone: "Asia/Tokyo" },
          // 毎週同じ曜日に繰り返し・学期終了日まで
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
