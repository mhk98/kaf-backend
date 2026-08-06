const { Op } = require("sequelize");
const https = require("https");
const http = require("http");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");

const buildOrderWhere = (filter) => {
  if (!filter || filter === "All") return {};
  const ACTIVE_STATUSES   = ["pending", "confirmed", "packaging", "on_hold", "in_courier", "delivered"];
  const INACTIVE_STATUSES = ["cancelled", "returned", "incomplete"];
  if (filter === "Active Customers")   return { status: { [Op.in]: ACTIVE_STATUSES   } };
  if (filter === "Inactive Customers") return { status: { [Op.in]: INACTIVE_STATUSES } };
  return {};
};

const getRecipients = async (filter) => {
  const where = { ...buildOrderWhere(filter), customerPhone: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }, { [Op.ne]: "Guest" }] } };
  const rows = await db.order.findAll({
    attributes: ["customerPhone", "customerName"],
    where,
    paranoid: true,
  });
  const seen = new Set();
  return rows.reduce((acc, r) => {
    const phone = r.customerPhone?.trim();
    if (phone && !seen.has(phone)) { seen.add(phone); acc.push({ phone, name: r.customerName }); }
    return acc;
  }, []);
};

const getSmsGatewaySettings = async () => {
  const row = await db.siteSetting.findOne({ where: { settingType: "sms_gateway" } });
  return row?.data || {};
};

// Normalize BD phone number to 880XXXXXXXXXX format
const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `880${digits.slice(1)}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
};

const httpRequest = (url, options, body) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(parsed, options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });

// SSL Wireless gateway (most common in Bangladesh)
const sendViaSslWireless = async (settings, recipients, smsText) => {
  const { apiToken, sid } = settings;
  if (!apiToken || !sid) throw new ApiError(500, "SSL Wireless: apiToken and sid are required in SMS gateway settings");

  const results = { sent: 0, failed: 0, errors: [] };

  for (const { phone } of recipients) {
    const msisdn = normalizePhone(phone);
    const params = new URLSearchParams({ api_token: apiToken, sid, msisdn, smstext: smsText, csmsid: `WZ${Date.now()}` });
    const url = `https://api.sslwireless.com/plain-api/send-sms?${params.toString()}`;

    try {
      const { status, body } = await httpRequest(url, { method: "GET" });
      if (status === 200 && !body.toLowerCase().includes("error")) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ phone, response: body.slice(0, 100) });
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ phone, error: err.message });
    }
  }

  return results;
};

// BDBulkSMS gateway
const sendViaBdBulkSms = async (settings, recipients, smsText) => {
  const { username, password, senderId } = settings;
  if (!username || !password) throw new ApiError(500, "BDBulkSMS: username and password are required in SMS gateway settings");

  const phones = recipients.map((r) => normalizePhone(r.phone)).join(",");
  const params = new URLSearchParams({ username, password, number: phones, message: smsText, senderId: senderId || "8809617612045" });
  const url = `http://api.bdbulksms.net/api.php?${params.toString()}`;

  const { status, body } = await httpRequest(url, { method: "GET" });
  const sent = status === 200 && !body.toLowerCase().includes("error") ? recipients.length : 0;
  return {
    sent,
    failed: recipients.length - sent,
    errors: sent ? [] : [{ response: body.slice(0, 200) }],
  };
};

// Twilio gateway (international)
const sendViaTwilio = async (settings, recipients, smsText) => {
  const { accountSid, authToken, fromNumber } = settings;
  if (!accountSid || !authToken || !fromNumber) throw new ApiError(500, "Twilio: accountSid, authToken and fromNumber are required");

  const results = { sent: 0, failed: 0, errors: [] };
  const auth64 = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  for (const { phone } of recipients) {
    const body = new URLSearchParams({ To: `+${normalizePhone(phone)}`, From: fromNumber, Body: smsText }).toString();
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    try {
      const { status, body: resp } = await httpRequest(url, {
        method: "POST",
        headers: { Authorization: `Basic ${auth64}`, "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
      }, body);
      if (status >= 200 && status < 300) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ phone, response: resp.slice(0, 100) });
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ phone, error: err.message });
    }
  }

  return results;
};

const sendSmsMarketing = async ({ customers = "All", smsText }) => {
  if (!smsText?.trim()) throw new ApiError(400, "SMS text is required");

  const recipients = await getRecipients(customers);
  if (recipients.length === 0) throw new ApiError(400, "No recipients found for selected filter");

  const settings = await getSmsGatewaySettings();
  const gatewayType = settings?.type || "";

  if (!gatewayType) {
    throw new ApiError(503, "SMS gateway is not configured. Please set up SMS gateway in Site Settings (settingType: sms_gateway).");
  }

  let result;
  if (gatewayType === "ssl_wireless") {
    result = await sendViaSslWireless(settings, recipients, smsText);
  } else if (gatewayType === "bdbulksms") {
    result = await sendViaBdBulkSms(settings, recipients, smsText);
  } else if (gatewayType === "twilio") {
    result = await sendViaTwilio(settings, recipients, smsText);
  } else {
    throw new ApiError(503, `Unsupported SMS gateway type: "${gatewayType}". Supported: ssl_wireless, bdbulksms, twilio`);
  }

  return {
    recipientCount: recipients.length,
    filter:         customers,
    gatewayType,
    sent:           result.sent,
    failed:         result.failed,
    errors:         result.errors,
    message:        `SMS sent to ${result.sent} of ${recipients.length} recipient(s).`,
  };
};

module.exports = { sendSmsMarketing };
