module.exports = {
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"eslint-config-prettier",
		"prettier",
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: ["./tsconfig.json"],
	},
	plugins: ["@typescript-eslint"],
	root: true,
	env: {
		node: true,
		jest: true,
	},
	ignorePatterns: [
		"bin/*",
		"node_modules/*",
		"expressots.config.ts",
		"commitlint.config.ts",
		"vitest.config.ts",
		".eslintrc.cjs",
		"coverage/*",
	],
	rules: {
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-unused-vars": "off",
		"@typescript-eslint/no-empty-function": "off",
		"no-trailing-spaces": ["error", { skipBlankLines: true }],
		"no-multi-spaces": ["error", { ignoreEOLComments: true }],
		"no-multi-spaces": "off",
		"no-async-promise-executor": "off",
	},
};
