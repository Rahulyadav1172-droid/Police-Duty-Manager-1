import { logger } from "./logger";

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

type SmsResult = { success: boolean; message: string };

async function sendSms(mobile: string, message: string): Promise<SmsResult> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    logger.warn("FAST2SMS_API_KEY not set — skipping SMS");
    return { success: false, message: "API key not configured" };
  }

  // Normalize mobile — strip leading +91 or 0, keep 10 digits
  const normalized = mobile.replace(/^\+91|^0/, "").replace(/\D/g, "").slice(-10);
  if (normalized.length !== 10) {
    logger.warn({ mobile }, "Invalid mobile number — skipping SMS");
    return { success: false, message: "Invalid mobile number" };
  }

  try {
    const res = await fetch(FAST2SMS_URL, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",          // Quick transactional route (DLT not required for quick)
        message,
        language: "english",
        flash: 0,
        numbers: normalized,
      }),
    });

    const data = (await res.json()) as { return: boolean; message: string[] };

    if (data.return === true) {
      logger.info({ mobile: normalized }, "SMS sent successfully");
      return { success: true, message: "Sent" };
    }

    const errMsg = Array.isArray(data.message) ? data.message.join(", ") : String(data.message);
    logger.warn({ mobile: normalized, errMsg }, "SMS send failed");
    return { success: false, message: errMsg };
  } catch (err) {
    logger.error({ err, mobile: normalized }, "SMS request error");
    return { success: false, message: "Network error" };
  }
}

export async function notifyDutyAssigned(opts: {
  name: string;
  rank: string;
  beltNumber: string;
  mobile: string;
  dutyPointName: string;
  dutyPointLocation: string;
  dutyType: "unlimited" | "fixed";
  startDateTime: Date;
  endDateTime: Date | null;
}): Promise<SmsResult> {
  const start = opts.startDateTime.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dutyLine =
    opts.dutyType === "unlimited"
      ? "Type: UNLIMITED (until released)"
      : (() => {
          const end = opts.endDateTime!.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          return `Type: FIXED | End: ${end}`;
        })();

  const message =
    `AYODHYA POLICE LINE\n` +
    `Duty Assigned: ${opts.rank} ${opts.name} (Belt: ${opts.beltNumber})\n` +
    `Post: ${opts.dutyPointName}, ${opts.dutyPointLocation}\n` +
    `Start: ${start}\n` +
    `${dutyLine}\n` +
    `Report to your post immediately. -Ayodhya Police Line`;

  return sendSms(opts.mobile, message);
}

export async function notifyDutyReleased(opts: {
  name: string;
  rank: string;
  beltNumber: string;
  mobile: string;
  dutyPointName: string;
  releasedAt: Date;
}): Promise<SmsResult> {
  const time = opts.releasedAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const message =
    `AYODHYA POLICE LINE\n` +
    `Duty Released: ${opts.rank} ${opts.name} (Belt: ${opts.beltNumber})\n` +
    `Post: ${opts.dutyPointName}\n` +
    `Released At: ${time}\n` +
    `You are now off duty. -Ayodhya Police Line`;

  return sendSms(opts.mobile, message);
}
