#!/usr/bin/env node

import {argv} from 'zx-extra'
import {copy} from './index.js'

await copy(argv._.slice(0, -1), argv._.slice(-1)[0], argv.m)
