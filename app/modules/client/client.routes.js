const { ENUM_USER_ROLE } = require("../../enums/user");
const auth = require("../../middlewares/auth");
const ClientController = require("./client.controller");
const router = require("express").Router();

router.post("/create", auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.ACCOUNTANT), ClientController.insertIntoDB);
router.get("/public", ClientController.getPublicClients);
router.get("/", auth(), ClientController.getAllFromDB);
router.get("/all", auth(), ClientController.getAllFromDBWithoutQuery);
router.get("/:id", auth(), ClientController.getDataById);
router.put("/:id", auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.ACCOUNTANT), ClientController.updateOneFromDB);
router.delete("/:id", auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.ACCOUNTANT), ClientController.deleteIdFromDB);

const ClientRoutes = router;
module.exports = ClientRoutes;
