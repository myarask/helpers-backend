const makeModels = require("helpers-database/models/_make");

const models = makeModels({
  username: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
  host: process.env.DB_HOST,
  dialect: "postgres",
  define: {
    timestamps: true,
    paranoid: true,
  },
});

export default models;
