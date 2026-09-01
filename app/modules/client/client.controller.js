const catchAsync = require("../../../shared/catchAsync");
const sendResponse = require("../../../shared/sendResponse");
const pick = require("../../../shared/pick");
const { ClientFilterAbleFileds } = require("./client.constants");
const ClientService = require("./client.service");

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await ClientService.insertIntoDB(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Client created!", data: result });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, ClientFilterAbleFileds);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await ClientService.getAllFromDB(filters, options);
  sendResponse(res, { statusCode: 200, success: true, message: "Clients fetched!", meta: result.meta, data: result.data });
});

const getAllFromDBWithoutQuery = catchAsync(async (req, res) => {
  const result = await ClientService.getAllFromDBWithoutQuery();
  sendResponse(res, { statusCode: 200, success: true, message: "Clients fetched!", data: result });
});

const getPublicClients = catchAsync(async (req, res) => {
  const result = await ClientService.getPublicClients();
  sendResponse(res, { statusCode: 200, success: true, message: "Public clients fetched!", data: result });
});

const getDataById = catchAsync(async (req, res) => {
  const result = await ClientService.getDataById(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Client fetched!", data: result });
});

const updateOneFromDB = catchAsync(async (req, res) => {
  const result = await ClientService.updateOneFromDB(req.params.id, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Client updated!", data: result });
});

const deleteIdFromDB = catchAsync(async (req, res) => {
  const result = await ClientService.deleteIdFromDB(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Client deleted!", data: result });
});

const ClientController = {
  insertIntoDB, getAllFromDB, getAllFromDBWithoutQuery, getPublicClients, getDataById, updateOneFromDB, deleteIdFromDB,
};

module.exports = ClientController;
