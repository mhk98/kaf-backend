const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const ApiError = require("../../../error/ApiError");
const db = require("../../../models");

const M = () => db.reseller;

const VALID_STATUSES = ["Pending", "Approved", "Rejected"];

const registerFromDB = async (payload = {}) => {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const address = String(payload.address || "").trim();

  if (!name) throw new ApiError(400, "Name is required");
  if (!/^01\d{9}$/.test(phone)) throw new ApiError(400, "Valid 11 digit phone number is required");
  if (!address) throw new ApiError(400, "Address is required");

  return M().create({ name, phone, address, status: "Pending" });
};

const getAllFromDB = async (filters = {}, options = {}) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm } = filters;
  const where = searchTerm
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { phone: { [Op.like]: `%${searchTerm}%` } },
          { address: { [Op.like]: `%${searchTerm}%` } },
        ],
      }
    : {};
  const order = options.sortBy && options.sortOrder
    ? [[options.sortBy, options.sortOrder.toUpperCase()]]
    : [["createdAt", "DESC"]];

  const [data, count] = await Promise.all([
    M().findAll({ where, offset: skip, limit, paranoid: true, order }),
    M().count({ where }),
  ]);

  return { meta: { count, page, limit }, data };
};

const getDataById = async (id) => {
  const row = await M().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "Reseller not found");
  return row;
};

const updateOneFromDB = async (id, payload = {}) => {
  const row = await getDataById(id);
  const data = {};
  if (payload.status !== undefined) {
    if (!VALID_STATUSES.includes(payload.status)) throw new ApiError(400, "Invalid status");
    data.status = payload.status;
  }
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.phone !== undefined) data.phone = payload.phone;
  if (payload.address !== undefined) data.address = payload.address;
  await row.update(data);
  return row;
};

const deleteIdFromDB = async (id) => {
  const row = await getDataById(id);
  await row.destroy();
  return { deleted: true };
};

module.exports = {
  registerFromDB,
  getAllFromDB,
  getDataById,
  updateOneFromDB,
  deleteIdFromDB,
};
