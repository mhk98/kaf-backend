module.exports = (sequelize, DataTypes) => {
  const Reseller = sequelize.define(
    "Reseller",
    {
      Id:        { type: DataTypes.INTEGER(10), primaryKey: true, autoIncrement: true, allowNull: false },
      name:      { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      phone:     { type: DataTypes.STRING(32), allowNull: false, validate: { notEmpty: true } },
      address:   { type: DataTypes.TEXT, allowNull: false },
      status:    { type: DataTypes.STRING(32), allowNull: false, defaultValue: "Pending" },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { timestamps: true, paranoid: true },
  );

  return Reseller;
};
