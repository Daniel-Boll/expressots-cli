import { CommandModule, Argv } from "yargs";
import { createTemplate } from "./form";
import chalk from "chalk";

type CommandModuleArgs = {};

const generateProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "generate [schematic] [path] [method]",
		describe: "Generate a schematic",
		aliases: ["g"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("schematic", {
				choices: [
					"usecase",
					"controller",
					"dto",
					"service",
					"provider",
				] as const,
				describe: "The schematic to generate",
				type: "string",
				coerce: coerceSchematicAliases,
			});

			yargs.positional("path", {
				describe: "The path to generate the schematic",
				type: "string",
			});

			yargs.positional("method", {
				choices: [
					"get",
					"post",
					"put",
					"patch",
					"delete",
				] as const,
				describe: "Type of request",
				type: "string",
			});

			return yargs;
		},
		handler: async ({ schematic, path, method }) => {
      const file = await createTemplate({ schematic, path, method });

			console.log(chalk.green(`> ${file.split(".")[0]} ${schematic} created! 🚀`))
		},
	};
};

const coerceSchematicAliases = (arg: string) => {
	switch (arg) {
		case "u":
			return "usecase";
		case "c":
			return "controller";
		case "d":
			return "dto";
		case "s":
			return "service";
		case "p":
			return "provider";
		default:
			return arg;
	}
};

export { generateProject };
