import EventEmmiter from 'events'
import path from 'path'
import catalogist from 'catalogist'

import OneC from './addIns/1C/index'


const AddIns = {}
global['AddIns'] = AddIns

export class AddIn extends EventEmmiter {

  #name: string

  constructor(name, cubismo) {
    super()

    this.#name = name
  }

  get name(): string {
    return this.#name
  }
}

export async function loadAddIns(cubismo, addIns): Promise<void> {

  return new Promise(async (resolve) => {
    // const addInDir = path.join(__dirname, 'addIns')
    // const addInDirTree = catalogist.treeSync(addInDir, {
    //   withSysRoot: true,
    //   childrenAlias: "next"
    // })


    const addIn = new OneC(cubismo);
    addIns.set('OneC', addIn)
    AddIns['OneC'] = addIn
    resolve()

    // addInDirTree.forEach(async (addInLevel) => {
      
    //   if (addInLevel.next) {
    //     if (!Utils.find(addInLevel.next, { fullName: 'package.json' })) {
    //       return // nothing to do
    //     }

    //     const config = require(path.join(addInLevel.fullPath, 'package.json'))
    //     const AddInClass = (await import(path.join(addInLevel.fullPath, config.main))).default
    //     const addIn = new AddInClass()
    //     addIns.set(config.addInName || addInLevel.name, addIn)
    //     AddIns[config.addInName] = addIn
    //     resolve()
    //   }
    // })
  })
}