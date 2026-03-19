module.exports = {
  root: true,
  extends: [require.resolve("@aura/config-eslint")],
  ignorePatterns: ["dist/", "node_modules/", "prisma/migrations/"],
};
