import path, * as nodePath from "path";
import { mkdirSync, readFileSync } from "node:fs";
import { render } from "mustache";
import { writeFileSync, existsSync } from "fs";
import chalk from "chalk";
import { anyCaseToCamelCase, anyCaseToKebabCase, anyCaseToPascalCase, anyCaseToLowerCase } from "@expressots/boost-ts";
import Compiler from "../utils/compiler";
import { Pattern } from "../types";
import { addControllerToModule } from "../utils/add-controller-to-module";
import { verifyIfFileExists } from "../utils/verify-file-exists";
import { addModuleToContainer } from "../utils/add-module-to-container";
import { printError } from "../utils/cli-ui";

function getFileNameWithoutExtension(filePath: string) {
	return filePath.split('.')[0];
}

type CreateTemplateProps = {
	schematic: string;
	path: string;
	method: string;
};

const messageColors = {
	usecase: (text: string) => chalk.cyan(text),
	controller: (text: string) => chalk.magenta(text),
	dto: (text: string) => chalk.blue(text),
	provider: (text: string) => chalk.yellow(text),
	module: (text: string) => chalk.red(text),
	entity: (text: string) => chalk.gray(text),
} as { [key: string]: (text: string) => string }

export const createTemplate = async ({
	schematic,
	path: target,
	method,
}: CreateTemplateProps) => {
	const { opinionated, sourceRoot } = await Compiler.loadConfig();

	if (sourceRoot === "") {
		printError("You must specify a source root in your expressots.config.ts","sourceRoot");
		process.exit(1);
	}

	let folderMatch = "";

	if (opinionated) {
		folderMatch = schematicFolder(schematic);
	} else {
		folderMatch = "";
	}

	const { path, file, className } = await splitTarget({ target, schematic });
	console.log({ path, file, className });

	const usecaseDir = `${sourceRoot}/${folderMatch}`;

	await verifyIfFileExists(`${usecaseDir}/${path}${file}`)

	mkdirSync(`${usecaseDir}/${path}`, { recursive: true });

	if (schematic !== "service") {
		console.log(messageColors[schematic](`> [${schematic}] Creating ${file}...`));
		
		writeTemplate({
			outputPath: `${usecaseDir}/${path}${file}`,
			template: {
				path: `./templates/${schematic}.tpl`,
				data: {
					className,
					route: path.replace(/\/$/, ''),
					construct: anyCaseToKebabCase(className),
					method: getHttpMethod(method),
				},
			},
		});
	} else {
		for await (const resource of ["controller-service", "usecase", "dto"]) {
			const currentSchematic = resource.replace("controller-service", "controller");

			const schematicFile = file.replace(
				`controller.ts`,
				`${currentSchematic}.ts`,
			);

			console.log(messageColors[currentSchematic](`> [${currentSchematic}] Creating ${schematicFile}...`));

			writeTemplate({
				outputPath: `${usecaseDir}/${path}${schematicFile}`,
				template: {
					path: `./templates/${resource}.tpl`,
					data: {
						className,
						fileName: getFileNameWithoutExtension(file),
						useCase: anyCaseToCamelCase(className),
						route: path.replace(/\/$/, ''),
						construct: anyCaseToKebabCase(className),
						method: getHttpMethod(method),
					},
				},
			});
		}
	}

	// Module generation
	const moduleName = path.split("/")[0];

	if (["controller", "service"].includes(schematic)) {
		if (existsSync(`${usecaseDir}/${moduleName}/${moduleName}.module.ts`)) {
			console.log(messageColors.module(`> [module] Adding controller to ${moduleName}.module.ts...`));

			const controllerPath = `./${path.split("/")[1]}/${file.slice(0, file.lastIndexOf('.'))}`

			await addControllerToModule(`${usecaseDir}/${moduleName}/${moduleName}.module.ts`, `${className}Controller`, controllerPath);
		} else {
			console.log(messageColors.module(`> [module] Creating ${moduleName}.module.ts...`));

			writeTemplate({
				outputPath: `${usecaseDir}/${moduleName}/${moduleName}.module.ts`,
				template: {
					path: `./templates/module.tpl`,
					data: {
						moduleName: moduleName[0].toUpperCase() + moduleName.slice(1),
						className,
						path: `${path.split("/")[1]}/${file.slice(0, file.lastIndexOf('.'))}`
					},
				},
			});

			await addModuleToContainer( moduleName);
		}
	}
	console.log(chalk.green(`> ${file.split(".")[0]} ${schematic} created! 🚀`));
	return file;
};

const getHttpMethod = (method: string) : string => {
	switch(method) {
		case "put":
			return "httpPut";
		case "post":
			return "httpPost";
		case "patch":
			return "httpPatch";
		case "delete":
			return "httpDelete";
		default:
			return "httpGet";
	}
}

const writeTemplate = ({
	outputPath,
	template: { path, data },
}: {
	outputPath: string;
	template: {
		path: string;
		data: Record<string, string>;
	};
}) => {
	writeFileSync(
		outputPath,
		render(readFileSync(nodePath.join(__dirname, path), "utf8"), data),
	);
};

const schematicFolder = (schematic: string): string | undefined => {
	switch (schematic) {
		case "usecase":
			return "useCases";
		case "controller":
			return "useCases";
		case "dto":
			return "useCases";
		case "service":
			return "useCases";
		case "provider":
			return "providers";
		case "entity":
			return "entities"
	}

	return undefined;
};

const splitTarget = async ({
	target,
	schematic,
}: {
	target: string;
	schematic: string;
}): Promise<{
	path: string;
	file: string;
	className: string;
}> => {
	/* if (schematic === "provider") {
		return await splitTargetProviderEdgeCase({ target, schematic });
	} */

	if (target.includes("/") || target.includes("\\") || target.includes("//")) {
		return await splitTargetProviderEdgeCase({ target, schematic });
	}

	if (schematic === "service") schematic = "controller"; // Anything just to generate

	// 1. Extract the name (first part of the target)
	const [name, ...remainingPath] = target.split("/");

	// 2. Check if the name is camelCase or kebab-case
	const camelCaseRegex = /[A-Z]/;
	const kebabCaseRegex = /[_\-\s]+/;

	const isCamelCase = camelCaseRegex.test(name);
	const isKebabCase = kebabCaseRegex.test(name);

	if (isCamelCase || isKebabCase) {
		const [wordName, ...path] = name
			?.split(isCamelCase ? /(?=[A-Z])/ : kebabCaseRegex)
			.map((word) => word.toLowerCase());

		return {
			path: `${wordName}/${pathEdgeCase(path)}${pathEdgeCase(remainingPath)}`,
			file: `${await getNameWithScaffoldPattern(name)}.${schematic}.ts`,
			className: anyCaseToPascalCase(name),
		};
	}

	// 3. Return the base case
	return {
		path: `${name}/${pathEdgeCase(remainingPath)}`,
		file: `${await getNameWithScaffoldPattern(name)}.${schematic}.ts`,
		className: anyCaseToPascalCase(name),
	};
};

const splitTargetProviderEdgeCase = async ({
	target,
	schematic,
}: {
	target: string;
	schematic: string;
}): Promise<{
	path: string;
	file: string;
	className: string;
}> => {
	// Check if the last path ends with a slash, if it does it's supposed to be a folder
	// and the name of the file will be the same as the folder
	const isFolder = target.endsWith("/");
	const path = target.split("/").slice(0, -1);
	const name = isFolder
		? path[path.length - 1]
		: target.split("/")[target.split("/").length - 1];

	return {
		path: pathEdgeCase(path),
		file: `${await getNameWithScaffoldPattern(name)}.${schematic}.ts`,
		className: anyCaseToPascalCase(name),
	};
};

const getNameWithScaffoldPattern = async (name: string) => {
	const configObject = await Compiler.loadConfig();

	switch (configObject.scaffoldPattern) {
		case Pattern.LOWER_CASE:
			return anyCaseToLowerCase(name);
		case Pattern.KEBAB_CASE:
			return anyCaseToKebabCase(name);
		case Pattern.PASCAL_CASE:
			return anyCaseToPascalCase(name);
		case Pattern.CAMEL_CASE:
			return anyCaseToCamelCase(name);
	}
};

const pathEdgeCase = (path: string[]): string => {
	return `${path.join("/")}${path.length > 0 ? "/" : ""}`;
};
