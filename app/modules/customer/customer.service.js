const bcrypt = require("bcryptjs");
const validator = require("validator");
const ApiError = require("../../../error/ApiError");
const { generateToken } = require("../../../helpers/jwtHelpers");
const db = require("../../../models");
const OrderService = require("../order/order.service");

const User = db.user;

const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "").trim();

const parseIdentifier = (value) => {
  const identifier = String(value || "").trim();
  const email = identifier.toLowerCase();
  if (validator.isEmail(email)) return { type: "email", value: email };

  let phone = normalizePhone(identifier);
  if (/^8801\d{9}$/.test(phone)) phone = phone.slice(2);
  if (/^01\d{9}$/.test(phone)) return { type: "phone", value: phone };
  return null;
};

const toCustomer = (user) => ({
  Id: user.Id,
  name: [user.FirstName, user.LastName].filter(Boolean).join(" ").trim() || user.FirstName || "Customer",
  phone: user.Phone || null,
  email: user.Email || null,
});

const register = async ({ name, identifier, phone, email, password }) => {
  const parsed = parseIdentifier(identifier || email || phone);
  if (!parsed || !password) {
    throw new ApiError(400, "Valid phone number or email and password are required");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existing = await User.findOne({
    where: parsed.type === "email" ? { Email: parsed.value } : { Phone: parsed.value },
  });
  if (existing) throw new ApiError(409, "Customer already exists");

  const nameParts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() || null;
  const lastName = nameParts.join(" ");

  const user = await User.create({
    FirstName: firstName,
    LastName: lastName || null,
    Email: parsed.type === "email" ? parsed.value : null,
    Phone: parsed.type === "phone" ? parsed.value : null,
    Password: password,
    role: "user",
    status: "Active",
  });

  return toCustomer(user);
};

const login = async ({ identifier, phone, email, password }) => {
  const parsed = parseIdentifier(identifier || email || phone);
  if (!parsed || !password) {
    throw new ApiError(400, "Valid phone number or email and password are required");
  }

  const user = await User.findOne({
    where: parsed.type === "email" ? { Email: parsed.value } : { Phone: parsed.value },
  });
  if (!user) throw new ApiError(401, "Invalid phone/email or password");
  if (user.status === "Inactive") throw new ApiError(403, "This account is deactivated");

  const valid = await bcrypt.compare(password, user.Password);
  if (!valid) throw new ApiError(401, "Invalid phone/email or password");

  const token = generateToken(user, { customer: true });
  return { token, customer: toCustomer(user) };
};

const getOrders = async (user) => {
  const phone = normalizePhone(user?.Phone || user?.phone);
  if (!phone) return [];
  const result = await OrderService.trackOrdersByPhoneFromDB(phone);
  return Array.isArray(result) ? result : result.orders || [];
};

const changePassword = async (user, { oldPassword, newPassword }) => {
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const row = await User.findOne({ where: { Id: user.Id } });
  if (!row) throw new ApiError(404, "Customer not found");

  const valid = await bcrypt.compare(oldPassword, row.Password);
  if (!valid) throw new ApiError(400, "Old password is incorrect");

  await row.update({ Password: newPassword });
  return { changed: true };
};

module.exports = { register, login, getOrders, changePassword };
