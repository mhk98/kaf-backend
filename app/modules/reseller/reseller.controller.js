const catchAsync = require("../../../shared/catchAsync");
const sendResponse = require("../../../shared/sendResponse");
const pick = require("../../../shared/pick");
const Service = require("./reseller.service");

const registerFromDB = catchAsync(async (req, res) => {
  const result = await Service.registerFromDB(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Reseller registration submitted", data: result });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const result = await Service.getAllFromDB(
    pick(req.query, ["searchTerm"]),
    pick(req.query, ["limit", "page", "sortBy", "sortOrder"]),
  );
  sendResponse(res, { statusCode: 200, success: true, message: "Resellers fetched", meta: result.meta, data: result.data });
});

const getDataById = catchAsync(async (req, res) => {
  const result = await Service.getDataById(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Reseller fetched", data: result });
});

const updateOneFromDB = catchAsync(async (req, res) => {
  const result = await Service.updateOneFromDB(req.params.id, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Reseller updated", data: result });
});

const deleteIdFromDB = catchAsync(async (req, res) => {
  const result = await Service.deleteIdFromDB(req.params.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Reseller deleted", data: result });
});

module.exports = {
  registerFromDB,
  getAllFromDB,
  getDataById,
  updateOneFromDB,
  deleteIdFromDB,
};
