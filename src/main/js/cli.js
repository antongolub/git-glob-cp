#!/usr/bin/env node

import {argv} from 'zx-extra'
import {copy} from './index.js'

await copy(argv._[0], argv._[1], argv.m)
