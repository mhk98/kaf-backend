const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const db = require("../../../models");
const Client = db.client;

const normalizePayload = (payload = {}, current = {}) => ({
  name: String(payload.name ?? current.name ?? "").trim(),
  logo: payload.logo ?? payload.file ?? current.logo ?? null,
  linkUrl: payload.linkUrl ?? payload.link ?? current.linkUrl ?? null,
  sortOrder: payload.sortOrder || payload.sortOrder === 0
    ? Number(payload.sortOrder)
    : current.sortOrder ?? 0,
  isActive: payload.status === false ||
    payload.status === "Inactive" ||
    payload.status === "inactive"
    ? false
    : payload.isActive ?? current.isActive ?? true,
});

const insertIntoDB = async (data) => {
  return await Client.create(normalizePayload(data));
};

const getAllFromDB = async (filters, options) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({ name: { [Op.like]: `%${searchTerm}%` } });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      [Op.and]: Object.entries(filterData).map(([key, value]) => ({
        [key]: { [Op.eq]: value },
      })),
    });
  }

  const whereConditions = andConditions.length ? { [Op.and]: andConditions } : {};

  const result = await Client.findAll({
    where: whereConditions,
    offset: skip,
    limit,
    paranoid: true,
    order: options.sortBy && options.sortOrder
      ? [[options.sortBy, options.sortOrder.toUpperCase()]]
      : [["sortOrder", "ASC"], ["createdAt", "DESC"]],
  });

  const count = await Client.count({ where: whereConditions });

  return { meta: { count, page, limit }, data: result };
};

const getAllFromDBWithoutQuery = async () => {
  return await Client.findAll({
    paranoid: true,
    order: [["sortOrder", "ASC"], ["createdAt", "DESC"]],
  });
};

const getPublicClients = async () => {
  const rows = await Client.findAll({
    where: { isActive: true },
    paranoid: true,
    order: [["sortOrder", "ASC"], ["createdAt", "ASC"], ["Id", "ASC"]],
  });

  return rows
    .filter((client) => client.logo)
    .map((client) => ({
      Id: client.Id,
      name: client.name,
      file: client.logo,
      linkUrl: client.linkUrl || null,
      sortOrder: client.sortOrder ?? client.Id,
    }));
};

const getDataById = async (id) => {
  return await Client.findOne({ where: { Id: id } });
};

const updateOneFromDB = async (id, payload) => {
  const row = await Client.findOne({ where: { Id: id } });
  if (!row) return [0];
  await row.update(normalizePayload(payload, row.toJSON()));
  return [1];
};

const deleteIdFromDB = async (id) => {
  return await Client.destroy({ where: { Id: id } });
};

const ClientService = {
  insertIntoDB, getAllFromDB, getAllFromDBWithoutQuery, getPublicClients, getDataById, updateOneFromDB, deleteIdFromDB,
};

module.exports = ClientService;
