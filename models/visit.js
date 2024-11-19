Visit.init({
  ip: DataTypes.STRING,
  user_agent: DataTypes.TEXT,
  city: DataTypes.STRING,
  region: DataTypes.STRING,
  country: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  visited_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
}, {
  sequelize,
  modelName: 'Visit',
  tableName: 'visits', // Force lowercase table name
});
