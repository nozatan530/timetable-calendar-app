import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const DAY_MAP: Record<string, number> = { 月: 1, 火: 2, 水: 3, 木: 4, 金: 5 };
const RRULE_DAY: Record<string, string> = { 月: "MO", 火: "TU", 水: "WE", 木: "TH", 金: "FR" };

// "YYYY-MM-DD" から曜日番号を返す（日=0, 月=1...）
// タイムゾーンの影響を受けないよう文字列を直接パース
function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Dateオブジェクトを使わずツェラーの公式で曜日を計算
  const date = new Date(y, m - 1, d); // ローカルタイムで生成（UTC変換なし）
  return date.getDay();
}

// "YYYY-MM-DD" に日数を加算して新しい日付文字列を返す
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// "YYYY-MM-DD" + "HH:MM" → JST dateTime文字列
function toJSTDateTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00+09:00`;
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

    // 学期開始日から最初の該当曜日を探す
    let firstDateStr = semesterStart;
    for (let i = 0; i < 7; i++) {
      if (getDayOfWeek(firstDateStr) === targetDayNum) break;
      firstDateStr = addDays(firstDateStr, 1);
    }

    const startDateTime = toJSTDateTime(firstDateStr, times.start);
    const endDateTime = toJSTDateTime(firstDateStr, times.end);

    // UNTIL は学期終了日の23:59:59 JSTをUTCに変換 → 14:59:59 UTC
    const untilDate = semesterEnd.replace(/-/g, "") + "T145959Z";

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
