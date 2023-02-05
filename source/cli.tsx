#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { importProject } from "./import";
import { createProject } from "./new";

yargs(hideBin(process.argv))
	.example("$0 new project my-project", "Create a new Expresso TS project")
	.command(createProject())
	.command(importProject())
	.demandCommand(1, "You need at least one command before moving on")
	.epilog("For more information, visit https://expresso-ts.com.")
	.help()
	.parse();
